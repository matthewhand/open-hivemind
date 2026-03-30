import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Discord, type DiscordService } from '@hivemind/message-discord';
import discordConfig, { type DiscordConfig } from '../config/discordConfig';
import type { IBotInfo } from '../types/botInfo';
import { type IMessageProvider } from '../types/IProvider';
import { ReconnectionManager } from './ReconnectionManager';

const debug = Debug('app:providers:DiscordProvider');

export class DiscordProvider implements IMessageProvider<DiscordConfig> {
  private reconManagers: Map<string, ReconnectionManager> = new Map();
  id = 'discord';
  label = 'Discord';
  type = 'messenger' as const;
  docsUrl = 'https://discord.com/developers/applications';
  helpText = 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';
  private discordService: InstanceType<typeof DiscordService>;

  constructor(discordService?: InstanceType<typeof DiscordService>) {
    this.discordService = discordService || (Discord as any).DiscordService.getInstance();
  }

  getSchema() {
    return discordConfig.getSchema();
  }

  getConfig() {
    return discordConfig;
  }

  getSensitiveKeys() {
    return ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  }

  async getStatus() {
    let discordInfo: any[] = [];
    try {
      const ds = this.discordService;
      const bots = (ds.getAllBots?.() || []) as IBotInfo[];

      discordInfo = bots.map((b) => {
        const name = b?.botUserName || b?.config?.name || 'discord';
        const reconManager = this.reconManagers.get(name);

        return {
          provider: 'discord',
          name,
          connected: reconManager ? reconManager.getStatus().state === 'connected' : true,
          status: reconManager ? reconManager.getStatus() : { state: 'connected' },
        };
      });
    } catch (e) {
      // Ignore if not initialized
    }
    return {
      ok: true,
      bots: discordInfo,
      count: discordInfo.length,
    };
  }

  getBotNames() {
    // Not strictly used by adminRoutes logic for Discord, but we can implement it
    return [];
  }

  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
    const { name, token, llm } = config;
    if (!token) {
      throw new Error('token is required');
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any = { discord: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      // Ignore
    }
    cfg.discord = cfg.discord || {};
    cfg.discord.instances = cfg.discord.instances || [];
    cfg.discord.instances.push({ name: name || '', token, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      debug('ERROR:', 'Failed writing messengers.json', e);
    }

    // Try runtime add
    const ds = this.discordService;
    const instanceCfg = { name: name || '', token, llm };
    if (ds.addBot) {
      const reconManager = new ReconnectionManager(`discord-${name}`, async () => {
        await ds.addBot(instanceCfg);
      });
      this.reconManagers.set(name || '', reconManager);

      // Start the bot connection with reconnection management
      reconManager.start().catch((err) => {
        debug(`Failed to start Discord bot ${name}: ${err.message}`);
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
    const ds = this.discordService;
    const bots = (ds.getAllBots?.() || []) as IBotInfo[];
    const have = new Set(bots.map((b) => b?.config?.discord?.token || b?.config?.token));
    const instances = cfg.discord?.instances || [];
    for (const inst of instances) {
      if (inst.token && !have.has(inst.token)) {
        const name = inst.name || '';
        const instanceCfg = { name, token: inst.token, llm: inst.llm };
        if (ds.addBot) {
          const reconManager = new ReconnectionManager(`discord-${name}`, async () => {
            await ds.addBot(instanceCfg);
          });
          this.reconManagers.set(name, reconManager);
          reconManager.start().catch((err) => {
            debug(`Failed to start Discord bot ${name} on reload: ${err.message}`);
          });
          added++;
        }
      }
    }
    return { added };
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    const ds = this.discordService;
    if (ds && typeof (ds as any).sendMessage === 'function') {
      return await (ds as any).sendMessage(channelId, message, senderName);
    }

    throw new Error(
      'DiscordProvider.sendMessage: DiscordService does not expose sendMessage method. ' +
        'This indicates a configuration or initialization issue.'
    );
  }

  async getMessages(channelId: string, limit?: number): Promise<any[]> {
    const ds = this.discordService;
    if (ds && typeof (ds as any).fetchMessages === 'function') {
      return await (ds as any).fetchMessages(channelId, limit);
    }
    if (ds && typeof (ds as any).getMessages === 'function') {
      return await (ds as any).getMessages(channelId, limit);
    }

    debug(
      'DiscordProvider.getMessages: DiscordService does not expose fetchMessages or getMessages'
    );
    return [];
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string> {
    // Delegate to DiscordService if it has a sendMessageToChannel method
    const ds = this.discordService;
    if (ds && typeof (ds as any).sendMessageToChannel === 'function') {
      return await (ds as any).sendMessageToChannel(channelId, message, active_agent_name);
    }

    // Fallback to sendMessage
    return await this.sendMessage(channelId, message, active_agent_name);
  }

  getClientId(): string {
    const ds = this.discordService;
    if (ds && typeof (ds as any).getClientId === 'function') {
      return (ds as any).getClientId();
    }

    // Fallback to generic identifier if service method not available
    return 'discord';
  }

  async getForumOwner(forumId: string): Promise<string> {
    const ds = this.discordService;

    // Try getChannelOwnerId method (existing in DiscordService)
    if (ds && typeof (ds as any).getChannelOwnerId === 'function') {
      const ownerId = await (ds as any).getChannelOwnerId(forumId);
      return ownerId || '';
    }

    // Legacy method names
    if (ds && typeof (ds as any).getForumOwner === 'function') {
      return await (ds as any).getForumOwner(forumId);
    }
    if (ds && typeof (ds as any).getChannelOwner === 'function') {
      return await (ds as any).getChannelOwner(forumId);
    }

    debug(
      'DiscordProvider.getForumOwner: DiscordService does not expose channel owner lookup method'
    );
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
      const ds = this.discordService;

      // Check if service is initialized
      if (!ds) {
        return {
          status: 'down',
          connected: false,
          details: 'Discord service not initialized',
        };
      }

      // Get all bots from the service
      const bots = (ds.getAllBots?.() || []) as IBotInfo[];

      if (bots.length === 0) {
        return {
          status: 'down',
          connected: false,
          details: 'No Discord bots configured',
        };
      }

      // Check each bot's connection status
      const botStatuses = bots.map((bot: any) => {
        const client = bot?.client;
        const isReady = client?.isReady?.() || false;
        const ping = client?.ws?.ping;

        return {
          name: bot?.botUserName || bot?.config?.name || 'discord',
          connected: isReady,
          ping,
        };
      });

      const connectedCount = botStatuses.filter((b) => b.connected).length;
      const totalCount = bots.length;

      let status: 'healthy' | 'degraded' | 'down';
      if (connectedCount === totalCount) {
        status = 'healthy';
      } else if (connectedCount > 0) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      const avgPing =
        botStatuses.filter((b) => b.ping !== undefined).reduce((sum, b) => sum + (b.ping || 0), 0) /
        (botStatuses.filter((b) => b.ping !== undefined).length || 1);

      return {
        status,
        connected: connectedCount > 0,
        lastPing: new Date(),
        details: `${connectedCount}/${totalCount} bot(s) connected${avgPing > 0 ? `, avg ping: ${Math.round(avgPing)}ms` : ''}`,
      };
    } catch (e: any) {
      debug(`[DiscordProvider] Health check failed: ${e.message}`);
      return {
        status: 'down',
        connected: false,
        details: 'Health check failed',
        error: e.message,
      };
    }
  }
}
