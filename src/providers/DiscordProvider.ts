import fs from 'fs';
import path from 'path';
import { Discord, type DiscordService } from '@hivemind/message-discord';
import discordConfig, { type DiscordConfig } from '../config/discordConfig';
import type { IBotInfo } from '../types/botInfo';
import { type IMessageProvider } from '../types/IProvider';
import Debug from 'debug';
const debug = Debug('app:providers:DiscordProvider');

export class DiscordProvider implements IMessageProvider<DiscordConfig> {
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
    let discordBots: string[] = [];
    let discordInfo: any[] = [];
    try {
      const ds = this.discordService;
      const bots = (ds.getAllBots?.() || []) as IBotInfo[];
      discordBots = bots.map((b) => b?.botUserName || b?.config?.name || 'discord');
      discordInfo = bots.map((b) => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
        connected: true,
      }));
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
      await ds.addBot(instanceCfg);
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
        const instanceCfg = { name: inst.name || '', token: inst.token, llm: inst.llm };
        if (ds.addBot) {
          await ds.addBot(instanceCfg);
          added++;
        }
      }
    }
    return { added };
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    // Delegate to DiscordService if it has a sendMessage method
    const ds = this.discordService;
    if (ds && typeof (ds as any).sendMessage === 'function') {
      return await (ds as any).sendMessage(channelId, message, senderName);
    }

    // TODO: Implement direct Discord API call or enhance DiscordService
    throw new Error(
      'DiscordProvider.sendMessage not fully implemented. ' +
        'DiscordService needs to expose a sendMessage method.'
    );
  }

  async getMessages(channelId: string, limit?: number): Promise<any[]> {
    // Delegate to DiscordService if it has a getMessages/fetchMessages method
    const ds = this.discordService;
    if (ds && typeof (ds as any).fetchMessages === 'function') {
      return await (ds as any).fetchMessages(channelId, limit);
    }
    if (ds && typeof (ds as any).getMessages === 'function') {
      return await (ds as any).getMessages(channelId, limit);
    }

    // TODO: Implement direct Discord API call or enhance DiscordService
    debug('DiscordProvider.getMessages not fully implemented');
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
    // Delegate to DiscordService if it has a getClientId method
    const ds = this.discordService;
    if (ds && typeof (ds as any).getClientId === 'function') {
      return (ds as any).getClientId();
    }

    // TODO: Return the actual Discord bot client ID
    // For now, return a generic identifier
    return 'discord';
  }

  async getForumOwner(forumId: string): Promise<string> {
    // Delegate to DiscordService if it has a getForumOwner/getChannelOwner method
    const ds = this.discordService;
    if (ds && typeof (ds as any).getForumOwner === 'function') {
      return await (ds as any).getForumOwner(forumId);
    }
    if (ds && typeof (ds as any).getChannelOwner === 'function') {
      return await (ds as any).getChannelOwner(forumId);
    }

    // TODO: Query Discord API to get channel/guild owner
    debug('DiscordProvider.getForumOwner not fully implemented');
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

      const avgPing = botStatuses
        .filter((b) => b.ping !== undefined)
        .reduce((sum, b) => sum + (b.ping || 0), 0) / (botStatuses.filter((b) => b.ping !== undefined).length || 1);

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
