import { Discord } from '@hivemind/adapter-discord';
import discordConfig from '../../config/discordConfig';
import { IProvider, IProviderMetadata, IBotStatus } from '../../types/IProvider';

export class DiscordProvider implements IProvider {
  private service: any;

  constructor() {
    // DiscordService is a singleton in the adapter, accessed via the namespace export
    this.service = (Discord as any).DiscordService.getInstance();
  }

  getMetadata(): IProviderMetadata {
    return {
      id: 'discord',
      label: 'Discord',
      type: 'message',
      configSchema: discordConfig.getSchema(),
      sensitiveFields: ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'],
      documentationUrl: 'https://discord.com/developers/applications',
      helpText: 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.',
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
    let bots: any[] = [];
    try {
      bots = this.service.getAllBots?.() || [];
    } catch {
      return [];
    }

    return bots.map((b: any) => ({
      name: b?.botUserName || b?.config?.name || 'discord',
      provider: 'discord',
      connected: true, // If listed, considered initialized
      metadata: {
        id: b?.client?.user?.id,
      },
    }));
  }

  async addBot(config: any): Promise<void> {
    const { name, token, llm } = config;
    const instanceCfg = { name: name || '', token, llm };

    if (this.service.addBot) {
      await this.service.addBot(instanceCfg);
    } else {
      throw new Error('DiscordService does not support addBot');
    }
  }

  async refresh(): Promise<void> {
    // Optional
  }
}
