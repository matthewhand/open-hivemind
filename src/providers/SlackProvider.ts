import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../config/slackConfig';
import { IMessageProvider } from '../types/IProvider';
import fs from 'fs';
import path from 'path';

export class SlackProvider implements IMessageProvider {
  public readonly id = 'slack';
  public readonly label = 'Slack';
  public readonly type = 'message';
  public readonly description = 'Slack messaging integration';
  public readonly docsUrl = 'https://api.slack.com/apps';
  public readonly helpText = 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';

  public getSchema(): Record<string, any> {
    return slackConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
  }

  public getConfig(): any {
    return slackConfig;
  }

  public async getStatus(): Promise<any> {
    try {
      const slack = SlackService.getInstance();
      const botNames = slack.getBotNames();

      const instances = botNames.map((name: string) => {
        const cfg: any = slack.getBotConfig(name) || {};
        return {
          name,
          defaultChannel: cfg?.slack?.defaultChannelId || '',
          mode: cfg?.slack?.mode || 'socket',
          connected: true
        };
      });

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
    const { name, token, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = config;
    const finalToken = token || botToken;

    if (!name || !finalToken) {
      throw new Error('name and token/botToken are required');
    }

    // Persist configuration
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const targetPath = path.join(configDir, 'providers/slack.json');
    let cfg: any = {};

    try {
      if (fs.existsSync(targetPath)) {
        cfg = JSON.parse(await fs.promises.readFile(targetPath, 'utf8'));
      }
    } catch (e) {
      // Start fresh
    }

    // Note: 'slack' key is not needed if we are in slack.json, but SlackService might expect structure.
    // However, here we are storing 'instances' which is an extension to the schema.
    cfg.instances = cfg.instances || [];

    // Remove existing if any (update behavior)
    cfg.instances = cfg.instances.filter((i: any) => i.name !== name);
    cfg.instances.push({
        name,
        token: finalToken,
        signingSecret,
        llm
    });

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    // Write back
    await fs.promises.writeFile(targetPath, JSON.stringify(cfg, null, 2), 'utf8');

    // Runtime add
    const slack = SlackService.getInstance();
    if ((slack as any).addBot) {
      await (slack as any).addBot({
          name,
          slack: {
              botToken: finalToken,
              signingSecret: signingSecret || '',
              appToken: appToken || '',
              defaultChannelId: defaultChannelId || '',
              joinChannels: joinChannels || '',
              mode: mode || 'socket'
          },
          llm
      });
    } else {
      throw new Error('SlackService.addBot is not available');
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
                  return json.slack?.instances || [];
              } else {
                  return json.instances || [];
              }
          } catch {
              return [];
          }
      };

      const slackPath = path.join(configDir, 'providers/slack.json');
      const messengersPath = path.join(configDir, 'providers/messengers.json'); // Check this too
      const legacyPath = path.join(configDir, 'messengers.json');

      const instances = [
          ...(await loadInstances(slackPath, false)),
          ...(await loadInstances(messengersPath, true)), // messengers.json has 'slack' key
          ...(await loadInstances(legacyPath, true))
      ];

      const slack = SlackService.getInstance();
      const existing = new Set(slack.getBotNames());

      for (const inst of instances) {
        const nm = inst.name || '';
        if (nm && !existing.has(nm)) {
          await (slack as any).addBot?.({
            name: nm,
            slack: {
              botToken: inst.token,
              signingSecret: inst.signingSecret || '',
              mode: inst.mode || 'socket',
            },
            llm: inst.llm
          });
        }
      }
    } catch (e) {
      console.warn('SlackProvider reload failed:', e);
    }
  }
}
