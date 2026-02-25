import { MattermostService, testMattermostConnection } from '@hivemind/adapter-mattermost';
import { IMessageProvider } from '../../registry/IMessageProvider';
import { ProviderMetadata } from '../../registry/IProvider';
import * as fs from 'fs';
import * as path from 'path';

export class MattermostProvider implements IMessageProvider {
  id = 'mattermost';
  label = 'Mattermost';
  type = 'message' as const;

  private get service() {
    return MattermostService.getInstance();
  }

  getMetadata(): ProviderMetadata {
    return {
      id: 'mattermost',
      label: 'Mattermost',
      docsUrl: 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
      helpText: 'Create a Mattermost bot account and generate a personal access token for it.',
      sensitiveFields: ['token'],
      configSchema: {
        mattermost: {
          properties: {
            token: { type: 'string', sensitive: true },
            serverUrl: { type: 'string' }
          }
        }
      }
    };
  }

  async getStatus(): Promise<any> {
    try {
        return { ok: true, bots: [], count: 0 };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
  }

  getBotNames(): string[] {
    return [];
  }

  getBotConfig(name: string): any {
    return {};
  }

  async addBot(config: any): Promise<void> {
    if ((this.service as any).addBot) {
        await (this.service as any).addBot(config);
    }
  }

  async testConnection(config: any): Promise<any> {
    const serverUrl = config.serverUrl || config.url;
    const token = config.token;
    return testMattermostConnection(serverUrl, token);
  }

  async refresh(): Promise<any> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'providers', 'mattermost.json');

    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      const cfg = JSON.parse(content);
      const instances = cfg.mattermost?.instances || [];

      for (const inst of instances) {
         try {
            await this.addBot(inst);
         } catch (e) {
            console.error('Failed to add Mattermost bot', e);
         }
      }
      return this.getStatus();
    } catch (e) {
      return this.getStatus();
    }
  }
}
