/**
 * Adapter that wraps one or more {@link IMessengerService} instances as a
 * pipeline {@link MessageSender}.
 *
 * Delegates `sendToChannel()` to the messenger service's
 * `sendMessageToChannel()` method, optionally selecting the service by
 * platform and forwarding thread / reply arguments when provided.
 *
 * @module pipeline/adapters/MessageSenderAdapter
 */

import type { IMessengerService } from '@hivemind/shared-types';
import type { MessageSender, MessageSendOptions } from '@src/pipeline/SendStage';

/**
 * Dependencies required by the MessageSenderAdapter.
 */
export interface MessageSenderDeps {
  /** Primary / fallback messenger service. */
  messengerService: IMessengerService;
  /**
   * Optional map of platform/provider key → messenger service for multi-provider
   * deployments. Keys are matched case-insensitively against `options.platform`.
   */
  messengersByProvider?: Map<string, IMessengerService> | Record<string, IMessengerService>;
}

/**
 * Adapts an {@link IMessengerService} into the pipeline's
 * {@link MessageSender} interface.
 */
export class MessageSenderAdapter implements MessageSender {
  private readonly byProvider: Map<string, IMessengerService>;

  constructor(private deps: MessageSenderDeps) {
    this.byProvider = normalizeProviderMap(deps.messengersByProvider);
  }

  async sendToChannel(
    channelId: string,
    text: string,
    senderName?: string,
    options?: MessageSendOptions
  ): Promise<void> {
    const service = this.resolveService(options?.platform);
    await service.sendMessageToChannel(
      channelId,
      text,
      senderName,
      options?.threadId,
      options?.replyToMessageId
    );
  }

  private resolveService(platform?: string): IMessengerService {
    if (platform && this.byProvider.size > 0) {
      const key = platform.toLowerCase();
      const found = this.byProvider.get(key) ?? this.byProvider.get(platform);
      if (found) {
        return found;
      }
    }
    return this.deps.messengerService;
  }
}

/**
 * Normalize a provider map / record into a lower-cased Map for lookup.
 */
function normalizeProviderMap(
  input?: Map<string, IMessengerService> | Record<string, IMessengerService>
): Map<string, IMessengerService> {
  const map = new Map<string, IMessengerService>();
  if (!input) {
    return map;
  }

  const entries: Iterable<[string, IMessengerService]> =
    input instanceof Map ? input.entries() : Object.entries(input);

  for (const [key, service] of entries) {
    if (key && service) {
      map.set(String(key).toLowerCase(), service);
    }
  }
  return map;
}
