import { SlackService } from '@hivemind/adapter-slack';
import slackConfig from '../../config/slackConfig';
import { IProvider, IProviderMetadata, IBotStatus } from '../../types/IProvider';

export class SlackProvider implements IProvider {
  private service: any;

  constructor() {
    // SlackService is a singleton in the adapter
    this.service = SlackService.getInstance();
  }

  getMetadata(): IProviderMetadata {
    return {
      id: 'slack',
      label: 'Slack',
      type: 'message',
      configSchema: slackConfig.getSchema(),
      sensitiveFields: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'],
      documentationUrl: 'https://api.slack.com/apps',
      helpText:
        'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.',
    };
  }

  async getStatus(): Promise<any> {
    const bots = await this.getBots();
    return {
      ok: true,
      count: bots.length,
      bots,
    };
  }

  async getBots(): Promise<IBotStatus[]> {
    const botNames = this.service.getBotNames();
    return botNames.map((name: string) => {
      const cfg: any = this.service.getBotConfig(name) || {};
      return {
        name,
        provider: 'slack',
        connected: true, // If it's listed, it's considered active/connected
        metadata: {
          defaultChannel: cfg?.slack?.defaultChannelId || '',
          mode: cfg?.slack?.mode || 'socket',
        },
      };
    });
  }

  async addBot(config: any): Promise<void> {
    // Map generic config payload to Slack-specific structure
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
      config;

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

    if (this.service.addBot) {
      await this.service.addBot(instanceCfg);
    } else {
      throw new Error('SlackService does not support addBot');
    }
  }

  async refresh(): Promise<void> {
    // Optional: reload internal state if necessary
    // Currently, reload is handled by the caller pushing config to addBot
  }
}
