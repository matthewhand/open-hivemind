import fs from 'fs';
import path from 'path';
import { Discord, DiscordService } from '@hivemind/adapter-discord';
import discordConfig, { DiscordConfig } from '../config/discordConfig';
import type { IBotInfo } from '../types/botInfo';
import { IMessageProvider } from '../types/IProvider';

export class DiscordProvider implements IMessageProvider<DiscordConfig> {
  id = 'discord';
  label = 'Discord';
  type = 'messenger' as const;
  docsUrl = 'https://discord.com/developers/applications';
  helpText = 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';
  private discordService: DiscordService;

  constructor(discordService?: DiscordService) {
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
      console.error('Failed writing messengers.json', e);
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
}
