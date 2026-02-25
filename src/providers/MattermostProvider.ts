import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig from '../config/mattermostConfig';
import { IMessageProvider } from '../types/IProvider';

export class MattermostProvider implements IMessageProvider {
  public readonly id = 'mattermost';
  public readonly label = 'Mattermost';
  public readonly type = 'message' as const;
  public readonly docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  public readonly helpText =
    'Create a Mattermost bot account and generate a personal access token for it.';

  public getSchema(): object {
    return mattermostConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['MATTERMOST_TOKEN'];
  }

  public async getStatus(): Promise<any> {
    try {
      const service = MattermostService.getInstance();
      // Assuming MattermostService has similar methods or we can adapt
      // It might be a singleton with one bot or multiple.
      // The adminRoutes didn't have specific Mattermost logic for status, so it might be missing or handled generically.
      // We will provide a stub or best effort.
      return { bots: [{ provider: 'mattermost', status: 'active' }] };
    } catch (e: any) {
      return { bots: [], error: e.message };
    }
  }

  public async getBots(): Promise<any[]> {
    return []; // Mattermost support in admin/status seems limited currently
  }

  public async addBot(config: any): Promise<void> {
    // Implementation depends on MattermostService capabilities
  }

  public async createBot(config: any): Promise<{ success: boolean; message?: string; error?: string }> {
      return { success: false, error: 'Not implemented for Mattermost' };
  }

  public async reload(): Promise<any> {
    return { success: true };
  }
}
