import { Discord } from '@hivemind/adapter-discord';
import { IMessageProvider } from '../../registry/IMessageProvider';
import { ProviderMetadata } from '../../registry/IProvider';
import * as fs from 'fs';
import * as path from 'path';

export class DiscordProvider implements IMessageProvider {
  id = 'discord';
  label = 'Discord';
  type = 'message' as const;

  private get service() {
    return (Discord as any).DiscordService.getInstance();
  }

  getMetadata(): ProviderMetadata {
    return {
      id: 'discord',
      label: 'Discord',
      docsUrl: 'https://discord.com/developers/applications',
      helpText: 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.',
      sensitiveFields: ['token', 'botToken', 'clientSecret'],
      configSchema: {
        discord: {
          properties: {
            token: {
              type: 'string',
              sensitive: true,
            },
          }
        }
      }
    };
  }

  async getStatus(): Promise<any> {
    try {
      let bots: any[] = [];
      try {
        const ds = this.service;
        bots = (ds.getAllBots?.() || []) as any[];
      } catch {}

      const info = bots.map((b) => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
      }));

      return {
        ok: true,
        bots: info,
        count: bots.length
      };
    } catch (e) {
      return { ok: true, bots: [], count: 0, error: String(e) };
    }
  }

  getBotNames(): string[] {
    try {
      const bots = (this.service.getAllBots?.() || []) as any[];
      return bots.map((b) => b?.botUserName || b?.config?.name || 'discord');
    } catch {
      return [];
    }
  }

  getBotConfig(name: string): any {
    try {
      const bots = (this.service.getAllBots?.() || []) as any[];
      const bot = bots.find(b => (b?.botUserName === name || b?.config?.name === name));
      return bot?.config || {};
    } catch {
      return {};
    }
  }

  async addBot(config: any): Promise<void> {
     if (this.service.addBot) {
        await this.service.addBot(config);
     }
  }

  async testConnection(config: any): Promise<any> {
      // Import dynamically as in config.ts
      const { testDiscordConnection } = await import('@hivemind/adapter-discord');
      const token = config.token || config.botToken;
      return testDiscordConnection(token);
  }

  async refresh(): Promise<any> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'providers', 'discord.json');

    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      const cfg = JSON.parse(content);
      const instances = cfg.discord?.instances || [];

      for (const inst of instances) {
         try {
            await this.addBot(inst);
         } catch (e) {
            console.error('Failed to add Discord bot during refresh', e);
         }
      }
      return this.getStatus();
    } catch (e) {
      return this.getStatus();
    }
  }
}
