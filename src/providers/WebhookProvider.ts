import webhookConfig from '../config/webhookConfig';
import { IProvider } from '../types/IProvider';

export class WebhookProvider implements IProvider {
  public readonly id = 'webhook';
  public readonly label = 'Webhook';
  public readonly type = 'other' as const;
  public readonly description = 'Webhook integration configuration';

  public getSchema(): object {
    return webhookConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['WEBHOOK_SECRET']; // Assuming secret
  }
}
