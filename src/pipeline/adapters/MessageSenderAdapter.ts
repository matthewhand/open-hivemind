/**
 * Adapter that wraps an {@link IMessengerService} as a pipeline
 * {@link MessageSender}.
 *
 * Delegates `sendToChannel()` to the messenger service's
 * `sendMessageToChannel()` method.
 *
 * @module pipeline/adapters/MessageSenderAdapter
 */

import type { MessageSender } from '@src/pipeline/SendStage';
import type { IMessengerService } from '@message/interfaces/IMessengerService';

/**
 * Dependencies required by the MessageSenderAdapter.
 */
export interface MessageSenderDeps {
  messengerService: IMessengerService;
}

/**
 * Adapts an {@link IMessengerService} into the pipeline's
 * {@link MessageSender} interface.
 */
export class MessageSenderAdapter implements MessageSender {
  constructor(private deps: MessageSenderDeps) {}

  async sendToChannel(channelId: string, text: string, senderName?: string): Promise<void> {
    await this.deps.messengerService.sendMessageToChannel(channelId, text, senderName);
  }
}
