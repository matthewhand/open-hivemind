import { SlackService, testSlackConnection } from '@hivemind/adapter-slack';
import { IMessageProvider } from '../../registry/IMessageProvider';
import { ProviderMetadata } from '../../registry/IProvider';
import * as fs from 'fs';
import * as path from 'path';

export class SlackProvider implements IMessageProvider {
  id = 'slack';
  label = 'Slack';
  type = 'message' as const;

  private get service() {
    return SlackService.getInstance();
  }

  getMetadata(): ProviderMetadata {
    return {
      id: 'slack',
      label: 'Slack',
      docsUrl: 'https://api.slack.com/apps',
      helpText: 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.',
      sensitiveFields: ['botToken', 'signingSecret', 'appToken'],
      configSchema: {
        slack: {
          properties: {
            botToken: {
              type: 'string',
              sensitive: true,
            },
            appToken: {
              type: 'string',
              sensitive: true,
            },
            signingSecret: {
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
      const slackBots = this.service.getBotNames();
      const slackInfo = slackBots.map((name: string) => {
        const cfg: any = this.service.getBotConfig(name) || {};
        return {
          provider: 'slack',
          name,
          defaultChannel: cfg?.slack?.defaultChannelId || '',
          mode: cfg?.slack?.mode || 'socket',
        };
      });
      return {
        ok: true,
        bots: slackInfo,
        count: slackBots.length
      };
    } catch (e) {
      return { ok: true, bots: [], count: 0, error: String(e) };
    }
  }

  getBotNames(): string[] {
    try {
      return this.service.getBotNames();
    } catch {
      return [];
    }
  }

  getBotConfig(name: string): any {
    try {
      return this.service.getBotConfig(name);
    } catch {
      return {};
    }
  }

  async addBot(config: any): Promise<void> {
    if ((this.service as any).addBot) {
      await (this.service as any).addBot(config);
    } else {
      throw new Error('addBot not supported by SlackService');
    }
  }

  async testConnection(config: any): Promise<any> {
     // implementation calling testSlackConnection
     // check if config has botToken or token
     const token = config.botToken || config.token;
     return testSlackConnection(token);
  }

  async refresh(): Promise<any> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'providers', 'slack.json');

    try {
      const content = await fs.promises.readFile(configPath, 'utf8');
      const cfg = JSON.parse(content);
      const instances = cfg.slack?.instances || [];

      for (const inst of instances) {
         try {
            await this.addBot(inst);
         } catch (e) {
            console.error('Failed to add Slack bot during refresh', e);
         }
      }
      return this.getStatus();
    } catch (e) {
      return this.getStatus();
    }
  }
}
