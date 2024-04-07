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

async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    // Ensure originalMessage conforms to IMessage interface
    if (typeof originalMessage.getText !== 'function' || 
        typeof originalMessage.getChannelId !== 'function') {
        logger.error(`[messageHandler] The provided message does not implement the required methods of IMessage: ${JSON.stringify(originalMessage)}`);
        return;
    }

    const content = originalMessage.getText();
    const channelId = originalMessage.getChannelId();

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
        const requestBody = openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT);
        if (!requestBody) {
            logger.error('[messageHandler] Request body is empty or invalid.');
            return;
        }

        openAiManager.setIsResponding(true);

        // Send the request to the OpenAI API
        const responseContent = await openAiManager.sendRequest(requestBody);
        logger.debug(`[messageHandler] Received response from OpenAI.`);

        // Directly use the summary from the responseContent if it exists and is a string
        let messageContent = typeof responseContent.summary === 'string' ? responseContent.summary : "Sorry, I couldn't process your request.";

        // Send the processed response back to the channel
        await sendResponse(channelId, messageContent).catch(error => logger.error(`[messageHandler] Failed to send response: ${error}`));

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
