import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';

const debug = Debug('app:messageHandler');

/**
 * Message Handler
 *
 * This function is responsible for handling incoming messages, validating them, processing any commands they contain, 
 * and managing AI responses. It ensures that each message is appropriately handled based on the context provided 
 * by previous messages and the validation logic.
 *
 * Key Features:
 * - Validates incoming messages to ensure they meet the necessary criteria before processing.
 * - Processes commands within the message and generates appropriate responses.
 * - Manages the history of previous messages to provide context for more accurate processing.
 * - Logs important steps and potential issues for debugging purposes.
 *
 * @param originalMsg - The original message object implementing the IMessage interface.
 * @param historyMessages - The history of previous messages for context, defaults to an empty array.
 */
export async function messageHandler(
  originalMsg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  if (!originalMsg) {
    debug('[messageHandler] No original message provided.');
    return;
  }
  const startTime = Date.now();
  debug('[messageHandler] originalMsg: ' + JSON.stringify(originalMsg));
  const messageId = originalMsg.getMessageId();
  debug(
    '[messageHandler] Started processing message ID: ' +
    messageId +
    ' at ' +
    new Date(startTime).toISOString()
  );
  // Type guard to ensure originalMsg is a valid instance of IMessage
  if (!(originalMsg && 'getMessageId' in originalMsg)) {
    debug('[messageHandler] originalMsg is not a valid IMessage instance.');
    return;
  }
  debug('[messageHandler] originalMsg is a valid instance of IMessage.');
  // Validate getText method
  if (typeof originalMsg.getText !== 'function') {
    debug('[messageHandler] originalMsg does not have a valid getText method.');
    return;
  }
  debug('[messageHandler] originalMsg has a valid getText method.');
  if (!originalMsg.getText().trim()) {
    debug('[messageHandler] Received empty message.');
    return;
  }
  if (!validateMessage(originalMsg)) {
    debug('[messageHandler] Message validation failed.');
    return;
  }
  debug('[messageHandler] validated message');

  // Handle the response correctly for IMessage
  await processCommand(originalMsg, async (result: string) => {
    if (typeof originalMsg.reply === 'function') {
      await originalMsg.reply(result);
      debug('[messageHandler] Sent reply using originalMsg.reply');
    } else {
      debug('[messageHandler] originalMsg.reply is not a function, handling differently');
      // Add alternative handling if needed
    }
  });
  debug('[messageHandler] processed command');
}
