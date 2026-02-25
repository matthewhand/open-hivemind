import { IMessageProvider } from '../types/IProvider';
import { Discord } from '@hivemind/adapter-discord';
import discordConfig from '../config/discordConfig';
import fs from 'fs';
import path from 'path';

export class DiscordProvider implements IMessageProvider {
  public readonly id = 'discord';
  public readonly label = 'Discord';
  public readonly type = 'message' as const;
  public readonly description = 'Integration with Discord server';
  public readonly docsUrl = 'https://discord.com/developers/applications';
  public readonly helpText = 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';

  public getSchema(): object {
    return (discordConfig as any).getSchema ? (discordConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }

  public async getStatus(): Promise<any> {
    try {
      const service = (Discord as any).DiscordService.getInstance();
      const bots = (service.getAllBots?.() || []) as any[];
      return {
        ok: true,
        count: bots.length,
        bots: bots.map(b => ({
          name: b?.botUserName || b?.config?.name || 'discord',
          status: 'connected'
        }))
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  public async getBots(): Promise<any[]> {
    try {
      const service = (Discord as any).DiscordService.getInstance();
      const bots = (service.getAllBots?.() || []) as any[];
      return bots.map(b => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
      }));
    } catch {
      return [];
    }
  }

  public async addBot(config: any): Promise<void> {
    const { name, token, llm } = config || {};

    // Persist to config/providers/messengers.json
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any = { discord: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
       // Ignore ENOENT
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

    // Runtime add
    const service = (Discord as any).DiscordService.getInstance();
    await service.addBot({ name: name || '', token, llm });
  }

  public async reload(): Promise<any> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
         return { ok: false, error: 'messengers.json not found' };
      }
      throw e;
    }

    let added = 0;
    try {
      const service = (Discord as any).DiscordService.getInstance();
      const have = new Set(
        ((service.getAllBots?.() || []) as any[]).map(
          (b) => b?.config?.discord?.token || b?.config?.token
        )
      );
      const instances = cfg.discord?.instances || [];
      for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          await service.addBot?.({ name: inst.name || '', token: inst.token });
          added++;
        }
      }
    } catch (e) {
      console.error('Discord reload error', e);
    }
    return { ok: true, added };
  }
}
