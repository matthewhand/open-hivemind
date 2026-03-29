import { MattermostService } from '@hivemind/message-mattermost';
import mattermostConfig, { type MattermostConfig } from '../config/mattermostConfig';
import { type IMessageProvider } from '../types/IProvider';
import { ReconnectionManager } from './ReconnectionManager';

export class MattermostProvider implements IMessageProvider<MattermostConfig> {
  private reconManagers: Map<string, ReconnectionManager> = new Map();
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
      const reconManager = this.reconManagers.get(name);
      return {
        provider: 'mattermost',
        name,
        serverUrl: cfg.serverUrl || '',
        channel: cfg.channel || 'town-square',
        connected: reconManager ? reconManager.getStatus().state === 'connected' : true,
        status: reconManager ? reconManager.getStatus() : { state: 'connected' },
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
    const { name } = config;

    // Since MattermostProvider does not fully implement addBot yet, we
    // set up the foundation for the ReconnectionManager integration here.
    // When addBot is fully implemented, this manager should be initialized
    // and its `start` method called.

    const reconManager = new ReconnectionManager(
      `mattermost-${name || 'unnamed'}`,
      async () => {
        // Implementation for Mattermost connection goes here
        throw new Error('Method not implemented.');
      }
    );
    this.reconManagers.set(name || 'unnamed', reconManager);

    // This will immediately fail until the underlying implementation is written,
    // but fulfills the ReconnectionManager interface requirements.
    reconManager.start().catch((err) => {
      // debug(`Failed to start Mattermost bot ${name}: ${err.message}`);
    });

    throw new Error('Method not implemented.');
  }
}
