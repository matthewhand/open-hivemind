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
 * This class wraps the WebhookService to provide a common registration
 * point for the ProviderRegistry.
 */
export default class WebhookProvider {
  public id = 'webhook';
  public type = 'messenger';

  public getConfig() {
    return {};
  }

  public getSchema() {
    return schema;
  }

  public create(config: IAdapterConfig, dependencies: IServiceDependencies): IMessengerService {
    return new WebhookService(dependencies);
  }
}
