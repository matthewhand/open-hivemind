import fs from 'fs';
import path from 'path';
import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../config/slackConfig';
import { IMessageProvider } from '../types/IProvider';

export class SlackProvider implements IMessageProvider {
  public readonly id = 'slack';
  public readonly label = 'Slack';
  public readonly type = 'message' as const;
  public readonly docsUrl = 'https://api.slack.com/apps';
  public readonly helpText =
    'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';

  public getSchema(): object {
    return slackConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
  }

  public async getStatus(): Promise<any> {
    try {
      const service = SlackService.getInstance();
      const botNames = service.getBotNames();

      const info = botNames.map((name: string) => {
        const cfg: any = service.getBotConfig(name) || {};
        return {
          provider: 'slack',
          name,
          defaultChannel: cfg?.slack?.defaultChannelId || '',
          mode: cfg?.slack?.mode || 'socket',
        };
      });
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
    const service = SlackService.getInstance();
    await (service as any).addBot(config);
  }

  private getPaths() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    return {
        slack: path.join(configDir, 'providers/slack.json'),
        messengers: path.join(configDir, 'providers/messengers.json'),
        legacyMessengers: path.join(configDir, 'messengers.json') // Also check root/config/messengers.json as adminRoutes used it
    };
  }

  private async loadInstances(): Promise<any[]> {
      const paths = this.getPaths();
      let instances: any[] = [];

      // 1. Try slack.json
      try {
          const content = await fs.promises.readFile(paths.slack, 'utf8');
          const cfg = JSON.parse(content);
          if (Array.isArray(cfg.instances) && cfg.instances.length > 0) {
              return cfg.instances;
          }
      } catch (e) {}

      // 2. Try providers/messengers.json
      try {
          const content = await fs.promises.readFile(paths.messengers, 'utf8');
          const cfg = JSON.parse(content);
          if (cfg.slack?.instances && Array.isArray(cfg.slack.instances)) {
              instances = cfg.slack.instances;
          }
      } catch (e) {}

      // 3. Try config/messengers.json (legacy fallback)
      if (instances.length === 0) {
          try {
              const content = await fs.promises.readFile(paths.legacyMessengers, 'utf8');
              const cfg = JSON.parse(content);
              if (cfg.slack?.instances && Array.isArray(cfg.slack.instances)) {
                  instances = cfg.slack.instances;
              }
          } catch (e) {}
      }

      return instances;
  }

  public async createBot(config: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
        config || {};

      if (!name || !botToken || !signingSecret) {
        return { success: false, error: 'name, botToken, and signingSecret are required' };
      }

      const paths = this.getPaths();
      const instances = await this.loadInstances();

      // Read existing slack.json to preserve other config
      let cfg: any = {};
      try {
          const content = await fs.promises.readFile(paths.slack, 'utf8');
          cfg = JSON.parse(content);
      } catch (e) {
          // If slack.json doesn't exist, start fresh but with migrated instances
      }

      cfg.instances = instances; // Start with current instances (migrated if needed)
      cfg.instances.push({ name, token: botToken, signingSecret, llm });

      await fs.promises.mkdir(path.dirname(paths.slack), { recursive: true });
      await fs.promises.writeFile(paths.slack, JSON.stringify(cfg, null, 2), 'utf8');

      // Runtime add
      const instanceCfg = {
        name,
        slack: {
          botToken,
          signingSecret,
          appToken: appToken || '',
          defaultChannelId: defaultChannelId || '',
          joinChannels: joinChannels || '',
          mode: mode || 'socket',
        },
        llm,
      };
      await this.addBot(instanceCfg);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async reload(): Promise<any> {
    const instances = await this.loadInstances();
    const service = SlackService.getInstance();
    const existing = new Set(service.getBotNames());
    let added = 0;

    for (const inst of instances) {
      const nm = inst.name || '';
      if (!nm || !existing.has(nm)) {
        await (service as any).addBot?.({
          name: nm || `Bot${Date.now()}`,
          slack: {
            botToken: inst.token,
            signingSecret: inst.signingSecret || '',
            mode: inst.mode || 'socket',
          },
        });
        added++;
      }
    }
    return { success: true, added };
  }
}
