import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig from '../config/mattermostConfig';
import { IMessageProvider } from '../types/IProvider';

export class MattermostProvider implements IMessageProvider {
  id = 'mattermost';
  label = 'Mattermost';
  type = 'messenger' as const;
  docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  helpText = 'Create a Mattermost bot account and generate a personal access token for it.';

  getSchema() {
    return mattermostConfig.getSchema();
  }

  getConfigInstance() {
    return mattermostConfig;
  }

  getSensitiveKeys() {
    return ['MATTERMOST_TOKEN'];
  }

  async getStatus() {
    try {
      const svc = MattermostService.getInstance();
      return {
        ok: true,
        bots: svc ? ['mattermost'] : [],
        count: svc ? 1 : 0
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async getBots() {
    try {
        const svc = MattermostService.getInstance();
        if (svc) {
            return [{
                name: 'mattermost',
                provider: 'mattermost',
                connected: true
            }];
        }
        return [];
    } catch {
        return [];
    }
  }

  async addBot(config: any): Promise<void> {
    throw new Error('Runtime bot creation not supported for Mattermost yet.');
  }

  async reload(): Promise<any> {
     return { ok: true, message: 'Reload not implemented for Mattermost' };
  }
}
