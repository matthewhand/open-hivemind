import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/helpers/validateMessage';
import { processCommand } from '@src/message/helpers/processing/processCommand';
import { getMessageProvider } from '@src/message/helpers/getMessageProvider';

const debug = Debug('app:messageHandler');

/**
 * Message Handler
 *
 * Handles incoming messages by validating them, processing any commands they contain, 
 * and managing AI responses using the appropriate message provider. This function ensures 
 * that each message is processed accurately based on its content and context.
 *
 * @param originalMsg - The original message object implementing the IMessage interface.
 * @param historyMessages - The history of previous messages for context, defaults to an empty array.
 * @returns {Promise<void>}
 */
export async function messageHandler(
  originalMsg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  // Guard: Ensure a valid message object is provided
  if (!originalMsg) {
    debug('No original message provided.');
    return;
  }

  const startTime = Date.now();
  debug('Received message with ID:', originalMsg.getMessageId(), 'at', new Date(startTime).toISOString());

  // Type Guard: Ensure originalMsg implements IMessage and has necessary methods
  if (!(originalMsg && 'getMessageId' in originalMsg && typeof originalMsg.getMessageId === 'function')) {
    debug('originalMsg is not a valid IMessage instance.');
    return;
  }

  debug('originalMsg is a valid instance of IMessage.');

  // Guard: Check that getText method exists and is valid
  if (typeof originalMsg.getText !== 'function') {
    debug('originalMsg does not have a valid getText method.');
    return;
  }

  debug('originalMsg has a valid getText method.');

  // Guard: Ensure the message is not empty
  if (!originalMsg.getText().trim()) {
    debug('Received an empty message.');
    return;
  }

  // Validate the message
  if (!validateMessage(originalMsg)) {
    debug('Message validation failed.');
    return;
  }

  debug('Message validated successfully.');

  // Process the command within the message
  await processCommand(originalMsg, async (result: string) => {
    try {
      const messageProvider = getMessageProvider(); // Use the helper to get the message provider
      const channelId = originalMsg.getChannelId();

      await messageProvider.sendMessageToChannel(channelId, result); // Send the reply
      debug('Reply sent successfully.');
    } catch (replyError) {
      debug('Failed to send reply:', replyError);
    }
  });

  debug('Command processed successfully.');
}
