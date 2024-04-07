const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const LLMResponse = require('../interfaces/LLMResponse'); // Make sure the path is correct
const {
  sendResponse,
  processCommand,
  summarizeMessage,
  handleFollowUp,
  shouldProcessMessage
} = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');

/**
 * Handles incoming messages and processes them accordingly.
 * @param {IMessage} originalMessage - The original message object.
 * @param {Array} historyMessages - An array of historical messages for context.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();

    if (typeof originalMessage.getText !== 'function' || 
        typeof originalMessage.getChannelId !== 'function') {
        logger.error(`[messageHandler] The provided message does not implement the required methods of IMessage: ${JSON.stringify(originalMessage)}`);
        return;
    }

    const content = originalMessage.getText();
    const channelId = originalMessage.getChannelId();

    logger.debug(`[messageHandler] Handling message at ${new Date(startTime).toISOString()}: "${content}" with channelId: ${channelId}`);

    if (await processCommand(originalMessage, commands)) {
        logger.debug("[messageHandler] Command processed.");
        return;
    }

    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug("[messageHandler] Message processing skipped.");
        return;
    }

    // Check rate limits before proceeding
    if (!rateLimiter.canSendMessage()) {
        logger.warn('[messageHandler] Message rate limit exceeded. Please wait before sending more messages.');
        return; // Exit if the rate limit has been exceeded
    }

    try {
        const requestBody = openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT);
        openAiManager.setIsResponding(true);

        /** @type {LLMResponse} */
        const llmResponse = await openAiManager.sendRequest(requestBody);
        if (!(llmResponse instanceof LLMResponse)) {
            logger.error(`[messageHandler] The response from OpenAiManager.sendRequest is not an instance of LLMResponse.`);
            return;
        }

        logger.debug(`[messageHandler] Received response from OpenAI.`);
        let messageContent = llmResponse.getContent();

        // Check if the response exceeds the max token limit and if summarization is needed
        if (constants.LLM_ALWAYS_SUMMARISE || (llmResponse.getCompletionTokens() > constants.LLM_RESPONSE_MAX_TOKENS)) {
            logger.debug("[messageHandler] Response exceeds max token limit, summarizing...");
            messageContent = await summarizeMessage(messageContent);
        }
    
        await sendResponse(channelId, messageContent)
            .catch(error => logger.error(`[messageHandler] Failed to send response: ${error}`));

        if (await handleFollowUp(originalMessage)) {
            logger.debug("[messageHandler] Follow-up action completed.");
        }
    } catch (error) {
        logger.error(`[messageHandler] Failed to process message: ${error}`);
    } finally {
        openAiManager.setIsResponding(false);
        logger.info(`[messageHandler] Message handling complete. Elapsed time: ${Date.now() - startTime}ms`);
    }
}

module.exports = { messageHandler };
