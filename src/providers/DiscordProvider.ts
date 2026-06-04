import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { DiscordService } from '@hivemind/message-discord';
import type { IMessage } from '@message/interfaces/IMessage';
import discordConfig, { type DiscordConfig } from '../config/discordConfig';
import type { IMessage } from '../message/interfaces/IMessage';
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
  constructor(discordService?: any) {
>>>>>>> 14b838258 (security: lock down exposed resource routes and add Discord test endpoint)
    this.discordService = discordService || (DiscordService as any).getInstance();
  }

  getSchema(): Record<string, unknown> {
    return discordConfig.getSchema();
  }

  getConfig(): Record<string, unknown> {
    return discordConfig;
  }

  getSensitiveKeys(): string[] {
    return ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  }

  async getStatus(): Promise<{ ok: boolean; bots: Record<string, unknown>[]; count: number }> {
    let discordInfo: Record<string, unknown>[] = [];
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
    } catch {
      // Ignore if not initialized
    }
    return {
      ok: true,
      bots: discordInfo,
      count: discordInfo.length,
    };
  }

  getBotNames(): string[] {
    // Not strictly used by adminRoutes logic for Discord, but we can implement it
    return [];
  }

  async getBots(): Promise<Record<string, unknown>[]> {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: Record<string, unknown>): Promise<void> {
    const name = String(config.name ?? '');
    const token = config.token as string | undefined;
    const llm = config.llm;
    if (!token) {
      throw new Error('token is required');
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any = { discord: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch {
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
      const reconManager = new ReconnectionManager(
        `discord-${name}`,
        async () => {
          await ds.addBot(instanceCfg);
        },
        {
          healthCheckFn: async () => {
            try {
              // ds.getAllBots might not be completely stable if ds fails
              const bots = (ds.getAllBots?.() || []) as IBotInfo[];
              const bot = bots.find(
                (b) => b?.botUserName === name || b?.config?.name === name || b?.config?.name === ''
              );
              if (!bot) {
                return false;
              }
              // Check if the client is ready

              const client = bot?.client as any;
              return client?.isReady?.() === true;
            } catch {
              return false;
            }
          },
          healthCheckIntervalMs: 30000,
        }
      );
      this.reconManagers.set(name || '', reconManager);

      // Start the bot connection with reconnection management
      reconManager.start().catch((err: Error) => {
        debug(`Failed to start Discord bot ${name}: ${err.message}`);
      });
    }
  }

  async reload(): Promise<{ added: number }> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch {
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
          const reconManager = new ReconnectionManager(
            `discord-${name}`,
            async () => {
              await ds.addBot(instanceCfg);
            },

            {
              healthCheckFn: async () => {
                try {
                  const bots = (ds.getAllBots?.() || []) as IBotInfo[];
                  const bot = bots.find((b) => b?.config?.discord?.token === inst.token);
                  if (!bot) {
                    return false;
                  }

                  const client = bot?.client as any;
                  return client?.isReady?.() === true;
                } catch {
                  return false;
                }
              },
              healthCheckIntervalMs: 30000,
            }
          );
          this.reconManagers.set(name, reconManager);
          reconManager.start().catch((err: Error) => {
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

    if (ds && typeof ds.sendMessage === 'function') {
      return await ds.sendMessage(channelId, message, senderName);
    }

    throw new Error(
      'DiscordProvider.sendMessage: DiscordService does not expose sendMessage method. ' +
        'This indicates a configuration or initialization issue.'
    );
  }

  async getMessages(channelId: string, limit?: number): Promise<IMessage[]> {
    const ds = this.discordService;

    if (ds && typeof ds.getMessages === 'function') {
      return await ds.getMessages(channelId, limit);
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

    if (ds && typeof ds.sendMessageToChannel === 'function') {
      return await ds.sendMessageToChannel(channelId, message, active_agent_name);
    }

    // Fallback to sendMessage
    return await this.sendMessage(channelId, message, active_agent_name);
  }

  getClientId(): string {
    const ds = this.discordService;

    if (ds && typeof ds.getClientId === 'function') {
      return ds.getClientId();
    }

    // Fallback to generic identifier if service method not available
    return 'discord';
  }

  async getForumOwner(forumId: string): Promise<string> {
    const ds = this.discordService;

    // Try getChannelOwnerId method (existing in DiscordService)

    if (ds && typeof ds.getChannelOwnerId === 'function') {
      const ownerId = await ds.getChannelOwnerId(forumId);
      return ownerId || '';
    }

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

      const botStatuses = bots.map((bot) => {
        const client = bot?.client;

        const isReady = (client as any)?.isReady?.() || false;

        const ping = (client as any)?.ws?.ping;

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
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      debug(`[DiscordProvider] Health check failed: ${errMsg}`);
      return {
        status: 'down',
        connected: false,
        details: 'Health check failed',
        error: errMsg,
      };
    }
  }
}
