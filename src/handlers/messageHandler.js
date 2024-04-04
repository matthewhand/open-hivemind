const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const {
  sendResponse,
  processCommand,
  summarizeMessage,
  handleFollowUp,
  shouldProcessMessage
} = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');

/**
 * Handles incoming messages, processing commands and interacting with the OpenAI API as necessary.
 * 
 * This function is designed to be called with a generic message object that conforms to the IMessage interface,
 * and an optional array of history messages for context, allowing it to operate independently of the specific
 * messaging platform (e.g., Discord).
 * 
 * @param {IMessage} originalMessage - The message object received, conforming to the IMessage interface.
 * @param {IMessage[]} historyMessages - Optional. An array of message objects representing the recent message history for context.
 * @returns {Promise<void>} A promise that resolves when the message has been processed.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    // Validate originalMessage conforms to IMessage interface
    if (typeof originalMessage.getText !== 'function' || typeof originalMessage.getChannelId !== 'function') {
        logger.error(`[messageHandler] The provided message does not implement the required methods of IMessage: ${JSON.stringify(originalMessage)}`);
        return;
    }

    const content = originalMessage.getText();
    const channelId = originalMessage.getChannelId();

    // Log the handling process
    logger.debug(`[messageHandler] Handling message at ${new Date(startTime).toISOString()}: "${content}" with channelId: ${channelId}`);

    // Process any commands in the message
    if (await processCommand(originalMessage, commands)) {
        logger.debug("[messageHandler] Command processed.");
        return;
    }

    // Check if the message should be processed further
    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug("[messageHandler] Message processing skipped.");
        return;
    }

    try {
        // Prepare the request body for the OpenAI API call
        const openAiManager = OpenAiManager.getInstance();
        const requestBody = openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT);
        if (!requestBody) {
            logger.error('[messageHandler] Request body is empty or invalid.');
            return;
        }

        openAiManager.setIsResponding(true);

        // Send the request to the OpenAI API
        const responseContent = await openAiManager.sendRequest(requestBody);
        logger.debug(`[messageHandler] Received response from OpenAI.`);

        // Summarize the response and send it
        let messageToSend = await summarizeMessage(responseContent);
        logger.debug(`[messageHandler] Summarized message ready to send: ${messageToSend}`);

        await sendResponse(channelId, messageToSend).catch(error => logger.error(`[messageHandler] Failed to send response: ${error}`));

        // Handle any follow-up actions
        if (await handleFollowUp(originalMessage)) {
            logger.debug("[messageHandler] Follow-up action completed.");
        }
    } catch (error) {
        logger.error(`[messageHandler] Failed to process message: ${error}`);
    } finally {
        openAiManager.setIsResponding(false);
        const elapsedTime = Date.now() - startTime;
        logger.info(`[messageHandler] Message handling complete. Elapsed time: ${elapsedTime}ms`);
    }
}

module.exports = { messageHandler };
