// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const LLMInterface = require('../interfaces/LLMInterface');
const MessageResponseManager = require('../managers/MessageResponseManager');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp, prepareMessageBody, summarizeMessage } = require('../utils/messageHandlerUtils');

/**
 * Handles incoming messages by determining if they need responses, orchestrating the sending of those responses,
 * and managing any necessary follow-up interactions.
 *
 * @param {Object} originalMsg - The message object received from the Discord server.
 * @param {IMessage[]} historyMessages - Array of historical IMessage instances for context.
 */
async function messageHandler(originalMsg, historyMessages = []) {
    const startTime = Date.now();
    logger.debug(`[messageHandler] Started at ${new Date(startTime).toISOString()} for message: ${originalMsg.content}`);

    // Validate message object structure and necessary methods
    if (typeof originalMsg !== 'object' || !originalMsg.getChannelId || !originalMsg.content) {
        logger.error('[messageHandler] Invalid or incomplete message object received.');
        return;
    }

    if (!MessageResponseManager.getInstance().shouldReplyToMessage(originalMsg)) {
        logger.info("[messageHandler] No response needed based on the message content and settings.");
        return;  // Early exit if no response is needed
    }

    // Initialize the LLM Manager from LLMInterface
    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager is currently busy.");
        return;  // Exit if the LLM manager is busy
    }

    try {
        const channelId = originalMsg.getChannelId();
        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, channelId, historyMessages);
        logger.debug(`[messageHandler] Request body prepared: ${JSON.stringify(requestBody, null, 2)}`);

        // Additional debug before sending to log key request body elements
        logger.debug(`[messageHandler] Sending request with content: ${requestBody.messages.map(m => m.content).join(', ')}`);

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();

        // Check if responseContent is a string before trying to log part of it
        if (typeof responseContent === 'string' && responseContent.trim() !== '') {
            logger.debug(`[messageHandler] Response from LLM received: ${responseContent.substring(0, 50)}...`);
        } else {
            logger.error(`[messageHandler] Response from LLM received (non-string or empty): ${JSON.stringify(responseContent, null, 2)}`);
            return;
        }

        if (responseContent.length > 100) {
            logger.info("[messageHandler] Message exceeds 100 characters. Summarizing.");
            responseContent = await summarizeMessage(responseContent);
        }

        await sendResponse(responseContent, channelId, startTime);
        logger.debug("[messageHandler] Response sent to the channel successfully.");

        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("[messageHandler] Follow-up is enabled. Processing follow-up message.");
            const topic = originalMsg.channel.topic || "General Discussion";  // Dynamically determine or use a fallback
            await sendFollowUp(originalMsg, topic);
        }

    } catch (error) {
        logger.error(`[messageHandler] An error occurred: ${error.message}`, { originalMsg, error });
        // Handle specific errors if necessary (e.g., API limits exceeded, network issues)
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Processing complete. Elapsed time: ${processingTime}ms`);
    }
}

module.exports = { messageHandler };
