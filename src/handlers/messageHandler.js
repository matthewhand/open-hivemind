// Import necessary modules and managers
const DiscordManager = require('../managers/DiscordManager');
const OpenAiManager = require('../managers/OpenAiManager');
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

    // Ensure originalMsg is an object and has necessary methods
    if (typeof originalMsg !== 'object' || !originalMsg.getChannelId) {
        logger.error('[messageHandler] Invalid message object received.');
        return;
    }

    if (!MessageResponseManager.getInstance().shouldReplyToMessage(originalMsg)) {
        logger.info("[messageHandler] No response needed based on the message content and settings.");
        return;  // Early exit if no response is needed
    }

    try {
        const channelId = typeof originalMsg.getChannelId === 'function' ? originalMsg.getChannelId() : originalMsg.getChannelId;
        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, channelId, historyMessages);
        logger.debug(`[messageHandler] Request body prepared: ${JSON.stringify(requestBody, null, 2)}`);

        // Ensure requestBody is properly structured
        // if (typeof requestBody !== 'object' || !requestBody.prompt || !requestBody.model) {
        //     logger.error('[messageHandler] Request body is not correctly formatted.');
        //     return;
        // }

        let responseContent = await OpenAiManager.getInstance().sendRequest(requestBody);
        logger.debug(`[messageHandler] Response from OpenAI received: ${responseContent.substring(0, 50)}...`);

        // Type checking and error handling for responseContent
        if (!responseContent || typeof responseContent !== 'string') {
            logger.error('[messageHandler] OpenAI API returned no content or content is not a string.');
            return;
        }

        if (!responseContent) {
            logger.error('[messageHandler] OpenAI API returned no content.');
            return;
        }

        if (responseContent.length > 1000) {
            logger.info("[messageHandler] Message exceeds 1000 characters. Summarizing.");
            responseContent = await summarizeMessage(responseContent);
        }

        await sendResponse(responseContent, originalMsg.getChannelId(), startTime);
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