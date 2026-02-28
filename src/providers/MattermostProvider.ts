import { IMessageProvider } from '../types/IProvider';
import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig, { MattermostConfig } from '../config/mattermostConfig';

export class MattermostProvider implements IMessageProvider<MattermostConfig> {
  id = 'mattermost';
  label = 'Mattermost';
  type = 'messenger' as const;
  docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  helpText = 'Create a Mattermost bot account and generate a personal access token for it.';

  getSchema() {
    return mattermostConfig.getSchema();
  }

  getConfig() {
    return mattermostConfig;
  }

  getSensitiveKeys() {
    return ['MATTERMOST_TOKEN'];
  }

  async getStatus() {
     // TODO: Implement actual status check
    return {
      ok: true,
      bots: [],
      count: 0,
    };
  }

  getBotNames() {
    return [];
  }

  async getBots() {
      return [];
  }

  async addBot(config: any) {
    throw new Error('Method not implemented.');
  }
}
