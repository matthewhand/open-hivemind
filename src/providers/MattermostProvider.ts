import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig, { type MattermostConfig } from '../config/mattermostConfig';
import { type IMessageProvider } from '../types/IProvider';

export class MattermostProvider implements IMessageProvider<MattermostConfig> {
  id = 'mattermost';
  label = 'Mattermost';
  type = 'messenger' as const;
  docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  helpText = 'Create a Mattermost bot account and generate a personal access token for it.';
  private mattermostService: MattermostService;

  constructor(mattermostService?: MattermostService) {
    this.mattermostService = mattermostService || MattermostService.getInstance();
  }

  getSchema() {
    return mattermostConfig.getSchema();
  }

  getConfig() {
    return mattermostConfig;
  }

  getSensitiveKeys() {
    return ['MATTERMOST_TOKEN'];
  }

  /**
   * Retrieves the status of configured Mattermost bots.
   * Note: This currently simulates connection status and should be updated
   * to perform a real API check in the future.
   */
  async getStatus() {
    const mattermost = this.mattermostService;
    const botNames = mattermost.getBotNames();
    const bots = botNames.map((name: string) => {
      const cfg: any = mattermost.getBotConfig(name) || {};
      return {
        provider: 'mattermost',
        name,
        serverUrl: cfg.serverUrl || '',
        channel: cfg.channel || 'town-square',
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
    return this.mattermostService.getBotNames();
  }

  /**
   * Retrieves the current list of bots.
   */
  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
    throw new Error('Method not implemented.');
  }
}
