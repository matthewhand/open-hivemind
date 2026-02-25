import fs from 'fs';
import path from 'path';
import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../config/slackConfig';
import { IMessageProvider } from '../types/IProvider';

export class SlackProvider implements IMessageProvider {
  id = 'slack';
  label = 'Slack';
  type = 'messenger' as const;
  docsUrl = 'https://api.slack.com/apps';
  helpText = 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';

  getSchema() {
    return slackConfig.getSchema();
  }

  getConfigInstance() {
    return slackConfig;
  }

  getSensitiveKeys() {
    return ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
  }

  async getStatus() {
    try {
      const slack = SlackService.getInstance();
      const bots = slack.getBotNames();
      return {
        ok: true,
        bots: bots,
        count: bots.length,
        details: bots.map((name) => {
            const cfg: any = slack.getBotConfig(name) || {};
            return {
              name,
              defaultChannel: cfg?.slack?.defaultChannelId || '',
              mode: cfg?.slack?.mode || 'socket',
            };
        })
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async getBots() {
    const slack = SlackService.getInstance();
    const botNames = slack.getBotNames();
    return botNames.map((name) => {
      const cfg: any = slack.getBotConfig(name) || {};
      return {
        name,
        provider: 'slack',
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
        connected: true
      };
    });
  }

  async addBot(config: any): Promise<void> {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = config;

    // Persist to messengers.json (replicating adminRoutes logic)
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any = { slack: { instances: [] } };

    try {
      if (fs.existsSync(messengersPath)) {
        const fileContent = fs.readFileSync(messengersPath, 'utf8');
        cfg = JSON.parse(fileContent);
      }
    } catch (e) {
      // ignore
    }

    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];

    // Check if exists? Admin routes didn't check for existence on create, just pushed.
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try {
      fs.mkdirSync(path.dirname(messengersPath), { recursive: true });
      fs.writeFileSync(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing messengers.json', e);
    }

    const slack = SlackService.getInstance();
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
    await (slack as any).addBot(instanceCfg);
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

    const slack = SlackService.getInstance();
    const existing = new Set(slack.getBotNames());
    const instances = cfg.slack?.instances || [];
    let added = 0;

    for (const inst of instances) {
        const nm = inst.name || '';
        if (nm && !existing.has(nm)) {
            await (slack as any).addBot({
                name: nm,
                slack: {
                    botToken: inst.token,
                    signingSecret: inst.signingSecret || '',
                    mode: cfg.slack?.mode || 'socket',
                },
                llm: inst.llm
            });
            added++;
        }
    }
    return { ok: true, added };
  }
}
