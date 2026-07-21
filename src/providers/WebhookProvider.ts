import type {
  IAdapterConfig,
  IMessengerService,
  IServiceDependencies,
} from '@hivemind/shared-types';
import { schema } from '../../packages/message-webhook/src/schema';
import { WebhookService } from '../../packages/message-webhook/src/WebhookService';

/**
 * WebhookProvider
 *
 * Wraps WebhookService for ProviderRegistry. Outbound send performs a real
 * HTTP POST (throws when WEBHOOK_URL is unset — never returns a fake id).
 * Maturity: beta (push-based messenger; no history).
 */
export default class WebhookProvider {
  public id = 'webhook';
  public type = 'messenger';
  public maturity = 'beta' as const;

  public getConfig() {
    return {};
  }

  public getSchema() {
    return schema;
  }

  public create(config: IAdapterConfig, dependencies: IServiceDependencies): IMessengerService {
    return new WebhookService(dependencies, config as unknown as Record<string, unknown>);
  }
}
