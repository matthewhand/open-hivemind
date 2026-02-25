import * as MattermostAdapter from '@hivemind/adapter-mattermost';
import mattermostConfig from '../config/mattermostConfig';
import { IMessageProvider } from '../types/IProvider';

export class MattermostProvider implements IMessageProvider {
  public readonly id = 'mattermost';
  public readonly label = 'Mattermost';
  public readonly type = 'message';
  public readonly description = 'Mattermost messaging integration';
  public readonly docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  public readonly helpText = 'Create a Mattermost bot account and generate a personal access token for it.';

  public getSchema(): Record<string, any> {
    return mattermostConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['MATTERMOST_TOKEN'];
  }

  public getConfig(): any {
    return mattermostConfig;
  }

  public async getStatus(): Promise<any> {
    try {
      const svc = (MattermostAdapter as any).MattermostService?.getInstance() || (MattermostAdapter as any).default?.getInstance();
      if (!svc) {
        return { ok: true, instances: [], count: 0, message: 'Mattermost service not initialized' };
      }

      // Mattermost implementation details for getting bots/status are sparse, assume single instance for now
      return { ok: true, instances: [{ name: 'mattermost', connected: true }], count: 1 };
    } catch (e: any) {
      return { ok: false, error: e.message, instances: [] };
    }
  }

  public async getBots(): Promise<any[]> {
    const status = await this.getStatus();
    return status.instances || [];
  }

  public async addBot(config: any): Promise<void> {
    // Mattermost adapter might not support dynamic bot addition like Slack/Discord yet
    console.warn('MattermostProvider.addBot not fully implemented');
  }
}
