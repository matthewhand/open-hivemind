import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';

const debug = Debug('app:messageHandler');

/**
 * Message Handler
 *
 * Handles incoming messages, validating them, processing commands, and managing AI responses.
 * Ensures that each message is appropriately processed based on its content and context.
 *
 * @param originalMsg - The original message object implementing the IMessage interface.
 * @param historyMessages - The history of previous messages for context, defaults to an empty array.
 */
export async function messageHandler(
  originalMsg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  // Guard: Ensure a valid message object is provided
  if (!originalMsg) {
    debug('[messageHandler] No original message provided.');
    return;
  }

  const startTime = Date.now();
  debug('[messageHandler] Received message with ID:', originalMsg.getMessageId(), 'at', new Date(startTime).toISOString());

  // Type Guard: Ensure originalMsg implements IMessage and has necessary methods
  if (!(originalMsg && 'getMessageId' in originalMsg && typeof originalMsg.getMessageId === 'function')) {
    debug('[messageHandler] originalMsg is not a valid IMessage instance.');
    return;
  }

  debug('[messageHandler] originalMsg is a valid instance of IMessage.');

  // Guard: Check that getText method exists and is valid
  if (typeof originalMsg.getText !== 'function') {
    debug('[messageHandler] originalMsg does not have a valid getText method.');
    return;
  }

  debug('[messageHandler] originalMsg has a valid getText method.');

  // Guard: Ensure the message is not empty
  if (!originalMsg.getText().trim()) {
    debug('[messageHandler] Received an empty message.');
    return;
  }

  // Validate the message
  if (!validateMessage(originalMsg)) {
    debug('[messageHandler] Message validation failed.');
    return;
  }

  debug('[messageHandler] Message validated successfully.');

  // Process the command within the message
  await processCommand(originalMsg, async (result: string) => {
    if (typeof originalMsg.reply === 'function') {
      await originalMsg.reply(result);
      debug('[messageHandler] Reply sent successfully.');
    } else {
      debug('[messageHandler] originalMsg.reply is not a function, alternative handling needed.');
      // Alternative handling logic if necessary
    }
  });

  debug('[messageHandler] Command processed successfully.');
}
