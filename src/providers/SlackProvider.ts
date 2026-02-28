import { IMessageProvider } from '../types/IProvider';
import { SlackService } from '@hivemind/adapter-slack';
import slackConfig, { SlackConfig } from '../config/slackConfig';
import fs from 'fs';
import path from 'path';

export class SlackProvider implements IMessageProvider<SlackConfig> {
  id = 'slack';
  label = 'Slack';
  type = 'messenger' as const;
  docsUrl = 'https://api.slack.com/apps';
  helpText = 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.';
  private slackService: SlackService;

  constructor(slackService?: SlackService) {
    this.slackService = slackService || SlackService.getInstance();
  }

  getSchema() {
    return slackConfig.getSchema();
  }

  getConfig() {
    return slackConfig;
  }

  getSensitiveKeys() {
    return ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'];
  }

  async getStatus() {
    const slack = this.slackService;
    const botNames = slack.getBotNames();
    const bots = botNames.map((name: string) => {
      const cfg: any = slack.getBotConfig(name) || {};
      return {
        provider: 'slack',
        name,
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
        connected: true,
      };
    });
    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  getBotNames() {
    return this.slackService.getBotNames();
  }

  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
      config;

    if (!name || !botToken || !signingSecret) {
      throw new Error('name, botToken, and signingSecret are required');
    }

    // Persist to config/providers/messengers.json
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    // Also try ../../config if process.cwd() is src/admin (unlikely in runtime but handled in adminRoutes)
    // adminRoutes used: process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config')
    // We will use process.cwd() based path which is safer.

    let cfg: any = { slack: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        // Try fallback location if expected location fails, or just ignore?
        // adminRoutes had simpler logic.
      }
    }

    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing messengers.json', e);
    }

    // Runtime add
    const slack = this.slackService;
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

    if ((slack as any).addBot) {
        await (slack as any).addBot(instanceCfg);
    }
  }

  async reload() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: any) {
        return { added: 0 };
    }

    let added = 0;
    const slack = this.slackService;
    const existing = new Set(slack.getBotNames());
    const instances = cfg.slack?.instances || [];
    for (const inst of instances) {
        const nm = inst.name || '';
        if (!nm || !existing.has(nm)) {
           const instanceCfg = {
                name: nm || `Bot${Date.now()}`,
                slack: {
                  botToken: inst.token,
                  signingSecret: inst.signingSecret || '',
                  mode: cfg.slack?.mode || 'socket',
                  appToken: inst.appToken || '',
                  defaultChannelId: inst.defaultChannelId || '',
                  joinChannels: inst.joinChannels || ''
                },
                llm: inst.llm
           };
           if ((slack as any).addBot) {
               await (slack as any).addBot(instanceCfg);
               added++;
           }
        }
    }
    return { added };
  }
}
