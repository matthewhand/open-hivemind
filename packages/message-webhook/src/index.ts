/**
 * @hivemind/message-webhook
 *
 * Webhook adapter for Open Hivemind.
 */
import type {
  IMessengerService,
  IServiceDependencies,
} from '@hivemind/shared-types';
import { WebhookService } from './WebhookService';

export { WebhookService };
export { schema } from './schema';

/** Standard factory alias — PluginLoader uses create() as the single entry point */
export const create = (
  _config: any,
  dependencies: IServiceDependencies
): IMessengerService => {
  return new WebhookService(dependencies);
};

export const manifest = {
  displayName: 'Webhook',
  description: 'Connect your bots via HTTP Webhooks',
  type: 'message',
  minVersion: '1.0.0',
};

export default create;
