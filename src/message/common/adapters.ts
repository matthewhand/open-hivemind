import type { IMessage } from '@src/message/interfaces/IMessage';
import type { ICommonMessage } from './commonTypes';

/**
 * Converts a provider‑specific IMessage into a common message format.
 */
export function toCommonMessage(message: IMessage): ICommonMessage {
  return {
    text: message.getText(),
    senderId: message.getAuthorId(),
    channelId: message.getChannelId(),
    timestamp: message.getTimestamp(),
    // If your IMessage supports UI elements, add conversion logic here
  };
}

/**
 * (Optional) Converts a common message back to a provider‑specific format.
 * This may need to be implemented differently for each provider.
 */
export function fromCommonMessage(commonMsg: ICommonMessage): Partial<IMessage> {
  return {
    content: commonMsg.text,
    channelId: commonMsg.channelId,
    // Additional conversion logic can be added as needed.
  };
}
