// Import necessary modules and managers
const { processCommand } = require('../handlers/commandHandler');
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
    logger.debug(`[messageHandler] Started at ${new Date(startTime).toISOString()} for message ID: ${originalMsg?.id || 'unknown'}`);

    // Check if the message object is properly structured with necessary data
    if (!originalMsg || typeof originalMsg !== 'object' || !originalMsg.content || !originalMsg.getChannelId) {
        logger.error('[messageHandler] Invalid or incomplete message object received:', { originalMsg });
        return;
    }

    // Check if the message content is empty or the message is not intended to be processed
    if (!originalMsg.content.trim()) {
        logger.info("[messageHandler] Received an empty or whitespace-only message; no processing needed.");
        return;
    }

    // Use commandHandler to process potential commands
    if (await processCommand(originalMsg)) {
        logger.debug("[messageHandler] Processed as command.");
        return;  // If processed as command, no further action needed
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

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();

        // Validate the response content
        if (typeof responseContent !== 'string' || !responseContent.trim()) {
            logger.error(`[messageHandler] Invalid response content received: ${JSON.stringify(responseContent)}`);
            return;
        }

        logger.debug(`[messageHandler] Response from LLM received: ${responseContent.substring(0, 50)}...`);
        
        // if (responseContent.length > 100) {
        //     logger.info("[messageHandler] Message exceeds 100 characters. Summarizing.");
        //     responseContent = await summarizeMessage(responseContent);
        // }

        await sendResponse(responseContent, channelId, startTime);
        logger.debug("[messageHandler] Response sent to the channel successfully.");

        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("[messageHandler] Follow-up is enabled. Processing follow-up message.");
            const topic = originalMsg.channel.topic || "General Discussion";  // Use a fallback if no topic is set
            await sendFollowUp(originalMsg, topic);
        }

    } catch (error) {
        logger.error(`[messageHandler] An error occurred: ${error.message}`, { errorDetail: error, originalMsg });
        // Handle specific errors if necessary (e.g., API limits exceeded, network issues)
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Processing complete. Elapsed time: ${processingTime}ms`);
    }
}

module.exports = { messageHandler };
