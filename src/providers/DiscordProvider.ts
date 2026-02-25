import fs from 'fs';
import path from 'path';
import { Discord } from '@hivemind/adapter-discord';
import discordConfig from '../config/discordConfig';
import { IMessageProvider } from '../types/IProvider';

export class DiscordProvider implements IMessageProvider {
  public readonly id = 'discord';
  public readonly label = 'Discord';
  public readonly type = 'message' as const;
  public readonly docsUrl = 'https://discord.com/developers/applications';
  public readonly helpText =
    'Create a Discord application, add a bot, and copy the bot token from the Bot tab.';

  public getSchema(): object {
    return discordConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
  }

  public async getStatus(): Promise<any> {
    try {
      const service = (Discord as any).DiscordService.getInstance();
      const bots = (service.getAllBots?.() || []) as any[];
      const info = bots.map((b) => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
      }));
      return { bots: info };
    } catch (e: any) {
      return { bots: [], error: e.message };
    }
  }

  public async getBots(): Promise<any[]> {
    const status = await this.getStatus();
    return status.bots || [];
  }

  public async addBot(config: any): Promise<void> {
    const service = (Discord as any).DiscordService.getInstance();
    await service.addBot?.(config);
  }

  private getPaths() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    return {
        discord: path.join(configDir, 'providers/discord.json'),
        messengers: path.join(configDir, 'providers/messengers.json'),
        legacyMessengers: path.join(configDir, 'messengers.json')
    };
  }

  private async loadInstances(): Promise<any[]> {
      const paths = this.getPaths();
      let instances: any[] = [];

      // 1. Try discord.json
      try {
          const content = await fs.promises.readFile(paths.discord, 'utf8');
          const cfg = JSON.parse(content);
          if (Array.isArray(cfg.instances) && cfg.instances.length > 0) {
              return cfg.instances;
          }
      } catch (e) {}

      // 2. Try providers/messengers.json
      try {
          const content = await fs.promises.readFile(paths.messengers, 'utf8');
          const cfg = JSON.parse(content);
          if (cfg.discord?.instances && Array.isArray(cfg.discord.instances)) {
              instances = cfg.discord.instances;
          }
      } catch (e) {}

      // 3. Try config/messengers.json
      if (instances.length === 0) {
          try {
              const content = await fs.promises.readFile(paths.legacyMessengers, 'utf8');
              const cfg = JSON.parse(content);
              if (cfg.discord?.instances && Array.isArray(cfg.discord.instances)) {
                  instances = cfg.discord.instances;
              }
          } catch (e) {}
      }

      return instances;
  }

  public async createBot(config: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { name, token, llm } = config || {};
      if (!token) {
        return { success: false, error: 'token is required' };
      }

      const paths = this.getPaths();
      const instances = await this.loadInstances();

      let cfg: any = {};
      try {
          const content = await fs.promises.readFile(paths.discord, 'utf8');
          cfg = JSON.parse(content);
      } catch (e) {}

      cfg.instances = instances;
      cfg.instances.push({ name: name || '', token, llm });

      await fs.promises.mkdir(path.dirname(paths.discord), { recursive: true });
      await fs.promises.writeFile(paths.discord, JSON.stringify(cfg, null, 2), 'utf8');

      // Runtime add
      const instanceCfg = { name: name || '', token, llm };
      await this.addBot(instanceCfg);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async reload(): Promise<any> {
    const instances = await this.loadInstances();
    const service = (Discord as any).DiscordService.getInstance();
    const have = new Set(
      ((service.getAllBots?.() || []) as any[]).map(
        (b) => b?.config?.discord?.token || b?.config?.token
      )
    );
    let added = 0;

    for (const inst of instances) {
      if (inst.token && !have.has(inst.token)) {
        await service.addBot?.({ name: inst.name || '', token: inst.token });
        added++;
      }
    }
    return { success: true, added };
  }
}
