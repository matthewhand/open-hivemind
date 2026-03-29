import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { SlackService } from '@hivemind/message-slack';
import slackConfig, { type SlackConfig } from '../config/slackConfig';
import { type IMessageProvider } from '../types/IProvider';
import { ReconnectionManager } from './ReconnectionManager';
const debug = Debug('app:providers:SlackProvider');

export class SlackProvider implements IMessageProvider<SlackConfig> {
  private reconManagers: Map<string, ReconnectionManager> = new Map();
  id = 'slack';
  label = 'Slack';
  type = 'messenger' as const;
  docsUrl = 'https://api.slack.com/apps';
  helpText =
    'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';
  private slackService: InstanceType<typeof SlackService>;

  constructor(slackService?: InstanceType<typeof SlackService>) {
    this.slackService = slackService || SlackService.getInstance();
  }

  getSchema() {
    return slackConfig.getSchema();
  }

  getConfig() {
    return slackConfig;
  }

  getSensitiveKeys() {
    return ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
  }

  async getStatus() {
    const slack = this.slackService;
    const botNames = slack.getBotNames();
    const bots = botNames.map((name: string) => {
      const cfg: any = slack.getBotConfig(name) || {};
      const reconManager = this.reconManagers.get(name);
      return {
        provider: 'slack',
        name,
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
        connected: reconManager ? reconManager.getStatus().state === 'connected' : true,
        status: reconManager ? reconManager.getStatus() : { state: 'connected' },
      };
    });
    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  getBotNames() {
    return this.slackService.getBotNames();
  }

  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
      config;

    if (!name || !botToken || !signingSecret) {
      throw new Error('name, botToken, and signingSecret are required');
    }

    // Persist to config/providers/messengers.json
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    // Also try ../../config if process.cwd() is src/admin (unlikely in runtime but handled in adminRoutes)
    // adminRoutes used: process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config')
    // We will use process.cwd() based path which is safer.

    let cfg: any = { slack: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        // Try fallback location if expected location fails, or just ignore?
        // adminRoutes had simpler logic.
      }
    }

    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      debug('ERROR:', 'Failed writing messengers.json', e);
    }

    // Runtime add
    const slack = this.slackService;
    const instanceCfg = {
      name,
      slack: {
        botToken,
        signingSecret,
        appToken: appToken || '',
        defaultChannelId: defaultChannelId || '',
        joinChannels: joinChannels || '',
        mode: mode || 'socket',
      },
      llm,
    };

    if ((slack as any).addBot) {
      const reconManager = new ReconnectionManager(
        `slack-${name}`,
        async () => {
          await (slack as any).addBot(instanceCfg);
        }
      );
      this.reconManagers.set(name, reconManager);

      // Start the bot connection with reconnection management
      reconManager.start().catch((err) => {
        debug(`Failed to start Slack bot ${name}: ${err.message}`);
      });
    }
  }

  async reload() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: any) {
      return { added: 0 };
    }

    let added = 0;
    const slack = this.slackService;
    const existing = new Set(slack.getBotNames());
    const instances = cfg.slack?.instances || [];
    for (const inst of instances) {
      const nm = inst.name || '';
      if (!nm || !existing.has(nm)) {
        const nameToUse = nm || `Bot${Date.now()}`;
        const instanceCfg = {
          name: nameToUse,
          slack: {
            botToken: inst.token,
            signingSecret: inst.signingSecret || '',
            mode: cfg.slack?.mode || 'socket',
            appToken: inst.appToken || '',
            defaultChannelId: inst.defaultChannelId || '',
            joinChannels: inst.joinChannels || '',
          },
          llm: inst.llm,
        };
        if ((slack as any).addBot) {
          const reconManager = new ReconnectionManager(
            `slack-${nameToUse}`,
            async () => {
              await (slack as any).addBot(instanceCfg);
            }
          );
          this.reconManagers.set(nameToUse, reconManager);
          reconManager.start().catch((err) => {
            debug(`Failed to start Slack bot ${nameToUse} on reload: ${err.message}`);
          });
          added++;
        }
      }
    }
    return { added };
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    const slack = this.slackService;
    if (typeof (slack as any).sendMessageToChannel === 'function') {
      return await (slack as any).sendMessageToChannel(channelId, message, senderName);
    }

    throw new Error(
      'SlackProvider.sendMessage: SlackService does not expose sendMessageToChannel method. ' +
        'This indicates a configuration or initialization issue.'
    );
  }

  async getMessages(channelId: string, limit?: number): Promise<any[]> {
    const slack = this.slackService;
    if (typeof (slack as any).fetchMessages === 'function') {
      return await (slack as any).fetchMessages(channelId, limit);
    }
    if (typeof (slack as any).getMessages === 'function') {
      return await (slack as any).getMessages(channelId, limit);
    }

    debug('SlackProvider.getMessages: SlackService does not expose fetchMessages or getMessages');
    return [];
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string> {
    // For Slack, this is the primary method
    return await this.sendMessage(channelId, message, active_agent_name);
  }

  getClientId(): string {
    const slack = this.slackService;
    if (typeof (slack as any).getClientId === 'function') {
      return (slack as any).getClientId();
    }

    // Fallback to generic identifier if service method not available
    return 'slack';
  }

  async getForumOwner(forumId: string): Promise<string> {
    const slack = this.slackService;

    // Try new getChannelOwnerId method
    if (typeof (slack as any).getChannelOwnerId === 'function') {
      const ownerId = await (slack as any).getChannelOwnerId(forumId);
      return ownerId || '';
    }

    // Legacy method names
    if (typeof (slack as any).getForumOwner === 'function') {
      return await (slack as any).getForumOwner(forumId);
    }
    if (typeof (slack as any).getChannelOwner === 'function') {
      return await (slack as any).getChannelOwner(forumId);
    }

    debug('SlackProvider.getForumOwner: SlackService does not expose channel owner lookup method');
    return '';
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    connected: boolean;
    lastPing?: Date;
    details?: string;
    error?: string;
  }> {
    try {
      const slack = this.slackService;

      // Check if service is initialized
      if (!slack) {
        return {
          status: 'down',
          connected: false,
          details: 'Slack service not initialized',
        };
      }

      // Get all bot names
      const botNames = slack.getBotNames();

      if (botNames.length === 0) {
        return {
          status: 'down',
          connected: false,
          details: 'No Slack bots configured',
        };
      }

      // Check each bot's connection status
      const botStatuses = await Promise.allSettled(
        botNames.map(async (name: string) => {
          const cfg: any = slack.getBotConfig(name) || {};
          const botToken = cfg?.slack?.botToken;

          if (!botToken) {
            return {
              name,
              connected: false,
              error: 'No bot token configured',
            };
          }

          try {
            // Use Slack Web API to test the connection
            const startTime = Date.now();
            const response = await fetch('https://slack.com/api/auth.test', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${botToken}`,
                'Content-Type': 'application/json',
              },
            });

            const data = await response.json();
            const latency = Date.now() - startTime;

            if (data.ok) {
              return {
                name,
                connected: true,
                botId: data.user_id,
                teamName: data.team,
                latency,
              };
            } else {
              return {
                name,
                connected: false,
                error: data.error || 'Unknown error',
              };
            }
          } catch (e: any) {
            return {
              name,
              connected: false,
              error: e.message || 'Failed to connect to Slack API',
            };
          }
        })
      );

      const checkedBots = botStatuses.map((r) =>
        r.status === 'fulfilled' ? r.value : { name: 'unknown', connected: false, error: 'Health check failed' }
      );

      const connectedCount = checkedBots.filter((b) => b.connected).length;
      const totalCount = botNames.length;

      let status: 'healthy' | 'degraded' | 'down';
      if (connectedCount === totalCount) {
        status = 'healthy';
      } else if (connectedCount > 0) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      const errors = checkedBots.filter((b) => b.error).map((b) => b.error);

      return {
        status,
        connected: connectedCount > 0,
        lastPing: new Date(),
        details: `${connectedCount}/${totalCount} bot(s) connected`,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (e: any) {
      debug(`[SlackProvider] Health check failed: ${e.message}`);
      return {
        status: 'down',
        connected: false,
        details: 'Health check failed',
        error: e.message,
      };
    }
  }
}
