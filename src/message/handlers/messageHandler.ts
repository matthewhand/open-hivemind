import { IMessage } from '@src/interfaces/IMessage';
import { processCommand } from '@src/messageProcessing/processCommand';

/**
 * MessageHandler is responsible for handling incoming messages and directing them
 * to the appropriate processing functions. It ensures that the messages are in the correct format
 * and handles responses appropriately.
 */
export class MessageHandler {
  public async handleIncomingMessage(originalMsg: IMessage): Promise<void> {
    if (typeof originalMsg.getText === 'function') {
      const response = await processCommand(originalMsg);
      if (response && typeof originalMsg.reply === 'function') {
        originalMsg.reply(response);
      }
    } else {
      throw new Error('Message does not have a getText method');
    }
  }
}
