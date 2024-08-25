import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/validators/validateMessage';
import { processCommand } from '@src/message/messageProcessing/processCommand';
import logger from '@src/operations/logger';

/**
 * Handles an incoming message, validating it, processing commands, and managing AI responses.
 * @param originalMsg - The original message object.
 * @param historyMessages - The history of previous messages for context.
 */
export async function messageHandler(
  originalMsg: IMessage,
  historyMessages: IMessage[] = []
): Promise<void> {
  if (!originalMsg) {
    logger.error('[messageHandler] No original message provided.');
    return;
  }

  const startTime = Date.now();
  logger.debug('[messageHandler] originalMsg: ' + JSON.stringify(originalMsg));

  const messageId = originalMsg.getMessageId();
  logger.debug(
    '[messageHandler] Started processing message ID: ' +
    messageId +
    ' at ' +
    new Date(startTime).toISOString()
  );

  // Type guard to ensure originalMsg is a valid instance of IMessage
  if (!(originalMsg && 'getMessageId' in originalMsg)) {
    logger.error('[messageHandler] originalMsg is not a valid IMessage instance.');
    return;
  }

  logger.debug('[messageHandler] originalMsg is a valid instance of IMessage.');

  // Validate getText method
  if (typeof originalMsg.getText !== 'function') {
    logger.error('[messageHandler] originalMsg does not have a valid getText method.');
    return;
  }

  logger.debug('[messageHandler] originalMsg has a valid getText method.');

  if (!originalMsg.getText().trim()) {
    logger.info('[messageHandler] Received empty message.');
    return;
  }

  if (!validateMessage(originalMsg)) {
    logger.debug('[messageHandler] Message validation failed.');
    return;
  }

  logger.debug('[messageHandler] validated message');

  // Process command without checking for return value (processCommand returns void)
  await processCommand(originalMsg.getText(), (result) => originalMsg.reply(result));
  logger.debug('[messageHandler] processed command');
}
