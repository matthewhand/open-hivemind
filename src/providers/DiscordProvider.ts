import { Discord } from '@hivemind/adapter-discord';
import discordConfig from '../config/discordConfig';
import { IMessageProvider } from '../types/IProvider';
import fs from 'fs';
import path from 'path';

export class DiscordProvider implements IMessageProvider {
  public readonly id = 'discord';
  public readonly label = 'Discord';
  public readonly type = 'message';
  public readonly description = 'Discord messaging integration';
  public readonly docsUrl = 'https://discord.com/developers/applications';
  public readonly helpText = 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';

  public getSchema(): Record<string, any> {
    return discordConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_SECRET', 'DISCORD_CLIENT_ID'];
  }

  public getConfig(): any {
    return discordConfig;
  }

  public async getStatus(): Promise<any> {
    try {
      const ds = (Discord as any).DiscordService?.getInstance();
      if (!ds) {
        return { ok: true, instances: [], count: 0, message: 'Discord service not initialized' };
      }

      const bots = (ds.getAllBots?.() || []) as any[];
      const instances = bots.map((b) => ({
        name: b?.botUserName || b?.config?.name || 'discord',
        connected: b?.client?.isReady?.() || false,
        user: b?.user?.tag || 'unknown'
      }));

      return { ok: true, instances, count: instances.length };
    } catch (e: any) {
      return { ok: false, error: e.message, instances: [] };
    }
  }

  public async getBots(): Promise<any[]> {
    const status = await this.getStatus();
    return status.instances || [];
  }

  public async addBot(config: any): Promise<void> {
    const { name, token, llm } = config;

    if (!token) {
      throw new Error('token is required');
    }

    // Persist configuration
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const targetPath = path.join(configDir, 'providers/discord.json');
    let cfg: any = {};

    try {
      if (fs.existsSync(targetPath)) {
        cfg = JSON.parse(await fs.promises.readFile(targetPath, 'utf8'));
      }
    } catch (e) {
      // Start fresh
    }

    cfg.instances = cfg.instances || [];

    // Update or add
    cfg.instances = cfg.instances.filter((i: any) => (i.name || '') !== (name || ''));
    cfg.instances.push({ name: name || '', token, llm });

    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, JSON.stringify(cfg, null, 2), 'utf8');

    // Runtime add
    const ds = (Discord as any).DiscordService?.getInstance();
    if (ds && ds.addBot) {
      await ds.addBot({ name: name || '', token, llm });
    } else {
      throw new Error('DiscordService.addBot is not available');
    }
  }

  public async reload(): Promise<void> {
    try {
      const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');

      const loadInstances = async (filePath: string, isLegacy = false) => {
          if (!fs.existsSync(filePath)) return [];
          try {
              const data = await fs.promises.readFile(filePath, 'utf8');
              const json = JSON.parse(data);
              if (isLegacy) {
                  return json.discord?.instances || [];
              } else {
                  return json.instances || [];
              }
          } catch {
              return [];
          }
      };

      const discordPath = path.join(configDir, 'providers/discord.json');
      const messengersPath = path.join(configDir, 'providers/messengers.json');
      const legacyPath = path.join(configDir, 'messengers.json');

      const instances = [
          ...(await loadInstances(discordPath, false)),
          ...(await loadInstances(messengersPath, true)),
          ...(await loadInstances(legacyPath, true))
      ];

      const ds = (Discord as any).DiscordService?.getInstance();
      if (!ds) return;

      const have = new Set(
        ((ds.getAllBots?.() || []) as any[]).map(
          (b) => b?.config?.discord?.token || b?.config?.token
        )
      );

      for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          await ds.addBot?.({ name: inst.name || '', token: inst.token, llm: inst.llm });
        }
      }
    } catch (e) {
      console.warn('DiscordProvider reload failed:', e);
    }
  }
}
