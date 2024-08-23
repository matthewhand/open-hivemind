import { IMessage } from "@message/types/IMessage";
import { validateMessage } from "@message/validators/validateMessage";
import { processAIResponse } from "@message/handlers/processAIResponse";
import { processCommand } from "@message/helpers/messageProcessing/processCommand";
import logger from "@utils/logger";

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

    if (!(originalMsg if (!(originalMsg instanceof IMessage)) {if (!(originalMsg instanceof IMessage)) { 'getMessageId' in originalMsg)) {
        logger.error(
            '[messageHandler] originalMsg is not an instance of IMessage. Actual type: ' +
            originalMsg.constructor.name
        );
        return;
    } else {
        logger.debug('[messageHandler] originalMsg is a valid instance of IMessage.');
    }

    if (!originalMsg.getText || typeof originalMsg.getText !== 'function') {
        logger.error('[messageHandler] originalMsg does not have a valid getText method.');
        return;
    } else {
        logger.debug('[messageHandler] originalMsg has a valid getText method.');
    }

    if (originalMsg.getText && !originalMsg.getText().trim()) {
        logger.info('[messageHandler] Received empty message.');
        return;
    }

    if (!validateMessage(originalMsg)) {
        logger.debug('[messageHandler] Message validation failed.');
        return;
    }

    logger.debug('[messageHandler] validated message');

    if (await processCommand(originalMsg)) {
        logger.debug('[messageHandler] processed command');
        return;
    }

    await processAIResponse(originalMsg, historyMessages, startTime);
}
