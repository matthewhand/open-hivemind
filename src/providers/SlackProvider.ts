import { IMessageProvider } from '../types/IProvider';
import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../config/slackConfig';
import fs from 'fs';
import path from 'path';

export class SlackProvider implements IMessageProvider {
  public readonly id = 'slack';
  public readonly label = 'Slack';
  public readonly type = 'message' as const;
  public readonly description = 'Integration with Slack workspace';
  public readonly docsUrl = 'https://api.slack.com/apps';
  public readonly helpText = 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';

  public getSchema(): object {
    return (slackConfig as any).getSchema ? (slackConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }

  public async getStatus(): Promise<any> {
    try {
      const service = SlackService.getInstance();
      const botNames = service.getBotNames();
      return {
        ok: true,
        count: botNames.length,
        bots: botNames.map(name => ({
          name,
          status: 'connected', // Simplified
        }))
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  public async getBots(): Promise<any[]> {
    try {
      const service = SlackService.getInstance();
      const names = service.getBotNames();
      return names.map(name => {
        const cfg: any = service.getBotConfig(name) || {};
        return {
          provider: 'slack',
          name,
          defaultChannel: cfg?.slack?.defaultChannelId || '',
          mode: cfg?.slack?.mode || 'socket',
        };
      });
    } catch {
      return [];
    }
  }

  public async addBot(config: any): Promise<void> {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = config || {};

    // Persist to config/providers/messengers.json
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any = { slack: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }

    // Ensure structure exists if file was empty or missing parts
    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];

    // Add instance config
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing messengers.json', e);
    }

    // Runtime add
    const service = SlackService.getInstance();
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
    await (service as any).addBot(instanceCfg);
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
      const service = SlackService.getInstance();
      const existing = new Set(service.getBotNames());
      const instances = cfg.slack?.instances || [];
      for (const inst of instances) {
        const nm = inst.name || '';
        if (!nm || !existing.has(nm)) {
          await (service as any).addBot?.({
            name: nm || `Bot${Date.now()}`,
            slack: {
              botToken: inst.token,
              signingSecret: inst.signingSecret || '',
              mode: cfg.slack?.mode || 'socket',
            },
          });
          added++;
        }
      }
    } catch (e) {
      console.error('Slack reload error', e);
    }
    return { ok: true, added };
  }
}
