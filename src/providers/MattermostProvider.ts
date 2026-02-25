import { IMessageProvider } from '../types/IProvider';
import { MattermostService } from '@hivemind/adapter-mattermost';
import mattermostConfig from '../config/mattermostConfig';

export class MattermostProvider implements IMessageProvider {
  public readonly id = 'mattermost';
  public readonly label = 'Mattermost';
  public readonly type = 'message' as const;
  public readonly description = 'Integration with Mattermost server';
  public readonly docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  public readonly helpText = 'Create a Mattermost bot account and generate a personal access token for it.';

  public getSchema(): object {
    return (mattermostConfig as any).getSchema ? (mattermostConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }

  public async getStatus(): Promise<any> {
    try {
      const service = MattermostService.getInstance();
      return {
        ok: true,
        status: 'connected',
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  public async getBots(): Promise<any[]> {
    return [{
       provider: 'mattermost',
       name: 'mattermost'
    }];
  }

  public async addBot(config: any): Promise<void> {
    // Stub
  }

  public async reload(): Promise<any> {
    // Stub
    return { ok: true, added: 0 };
  }
}
