import { IMessage } from '@src/message/interfaces/IMessage';
import { validateMessage } from '@src/message/validators/validateMessage';
import { processCommand } from '@src/message/messageProcessing/processCommand';
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
    debug('[messageHandler] No original message provided.');
    return;
  }
  const startTime = Date.now();
  debug.debug('[messageHandler] originalMsg: ' + JSON.stringify(originalMsg));
  const messageId = originalMsg.getMessageId();
  debug.debug(
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
  debug.debug('[messageHandler] originalMsg is a valid instance of IMessage.');
  // Validate getText method
  if (typeof originalMsg.getText !== 'function') {
    debug('[messageHandler] originalMsg does not have a valid getText method.');
    return;
  }
  debug.debug('[messageHandler] originalMsg has a valid getText method.');
  if (!originalMsg.getText().trim()) {
    debug('[messageHandler] Received empty message.');
    return;
  }
  if (!validateMessage(originalMsg)) {
    debug.debug('[messageHandler] Message validation failed.');
    return;
  }
  debug.debug('[messageHandler] validated message');
  // Process command without checking for return value (processCommand returns void)
  await processCommand(originalMsg.getText(), (result) => originalMsg.reply(result));
  debug.debug('[messageHandler] processed command');
}
