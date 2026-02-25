import fs from 'fs';
import path from 'path';
import { Discord } from '@hivemind/adapter-discord';
import discordConfig from '../config/discordConfig';
import { IMessageProvider } from '../types/IProvider';

export class DiscordProvider implements IMessageProvider {
  id = 'discord';
  label = 'Discord';
  type = 'messenger' as const;
  docsUrl = 'https://discord.com/developers/applications';
  helpText = 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';

  getSchema() {
    return discordConfig.getSchema();
  }

  getConfigInstance() {
    return discordConfig;
  }

  getSensitiveKeys() {
    return ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  }

  async getStatus() {
    try {
      const ds = (Discord as any).DiscordService.getInstance();
      const bots = (ds.getAllBots?.() || []) as any[];
      return {
        ok: true,
        bots: bots.map(b => b?.botUserName || b?.config?.name || 'discord'),
        count: bots.length,
        details: bots.map(b => ({
            name: b?.botUserName || b?.config?.name || 'discord',
            provider: 'discord',
            connected: true
        }))
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async getBots() {
    try {
        const ds = (Discord as any).DiscordService.getInstance();
        const bots = (ds.getAllBots?.() || []) as any[];
        return bots.map((b) => ({
            name: b?.botUserName || b?.config?.name || 'discord',
            provider: 'discord',
            token: b?.config?.discord?.token || b?.config?.token,
            connected: true
        }));
    } catch {
        return [];
    }
  }

  async addBot(config: any): Promise<void> {
    const { name, token, llm } = config;

    // Persist to messengers.json
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any = { discord: { instances: [] } };

    try {
      if (fs.existsSync(messengersPath)) {
        const fileContent = fs.readFileSync(messengersPath, 'utf8');
        cfg = JSON.parse(fileContent);
      }
    } catch (e) {
      // ignore
    }

    cfg.discord = cfg.discord || {};
    cfg.discord.instances = cfg.discord.instances || [];
    cfg.discord.instances.push({ name: name || '', token, llm });

    try {
      fs.mkdirSync(path.dirname(messengersPath), { recursive: true });
      fs.writeFileSync(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing messengers.json', e);
    }

    const ds = (Discord as any).DiscordService.getInstance();
    const instanceCfg = { name: name || '', token, llm };
    await ds.addBot(instanceCfg);
  }

  async reload(): Promise<any> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    if (!fs.existsSync(messengersPath)) {
        return { ok: false, error: 'messengers.json not found' };
    }

    let cfg: any;
    try {
        cfg = JSON.parse(fs.readFileSync(messengersPath, 'utf8'));
    } catch (e: any) {
        return { ok: false, error: e.message };
    }

    const ds = (Discord as any).DiscordService.getInstance();
    const have = new Set(
        ((ds.getAllBots?.() || []) as any[]).map(
          (b) => b?.config?.discord?.token || b?.config?.token
        )
      );
    const instances = cfg.discord?.instances || [];
    let added = 0;

    for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          await ds.addBot({ name: inst.name || '', token: inst.token, llm: inst.llm });
          added++;
        }
    }
    return { ok: true, added };
  }
}
