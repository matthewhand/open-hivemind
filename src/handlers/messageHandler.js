const IMessage = require('../interfaces/IMessage');
const CommandManager = require('../managers/CommandManager');
const MessageResponseManager = require('../managers/MessageResponseManager');
const LLMInterface = require('../interfaces/LLMInterface');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp, prepareMessageBody, summarizeMessage } = require('../utils/messageHandlerUtils');

/**
 * Handles incoming messages by determining if they need responses, orchestrating the sending of those responses,
 * and managing any necessary follow-up interactions.
 * 
 * This handler uses the CommandManager to process commands and the LLMInterface for generating LLM-based responses.
 * If a message is not a command, it uses the MessageResponseManager to decide if a response should be generated.
 *
 * @param {IMessage} originalMsg - The message object received from the Discord server, implementing IMessage.
 * @param {IMessage[]} historyMessages - Array of historical IMessage instances for context.
 */
async function messageHandler(originalMsg, historyMessages = []) {
    const startTime = Date.now();
    logger.debug(`[messageHandler] Started at ${new Date(startTime).toISOString()} for message ID: ${originalMsg.getMessageId()}`);

    if (!(originalMsg instanceof IMessage)) {
        logger.error('[messageHandler] Message does not implement IMessage interface');
        return;
    }

    if (!originalMsg.getText().trim()) {
        logger.info("[messageHandler] Received an empty or whitespace-only message; no processing needed.");
        return;
    }

    // Initialize CommandManager with a response handler and the default channel ID
    const commandManager = new CommandManager(
        (responseText) => sendResponse(responseText, originalMsg.getChannelId(), startTime),
        originalMsg.getChannelId()
    );

    // Attempt to process the message as a command
    const processed = await commandManager.processCommand(originalMsg);
    if (processed) {
        logger.debug("[messageHandler] The message was processed as a command.");
        return;  // If processed as a command, no further action needed
    }

    // Check if a response is needed for non-command messages
    if (!MessageResponseManager.getInstance().shouldReplyToMessage(originalMsg)) {
        logger.info("[messageHandler] No response needed based on the message content and settings.");
        return;  // Early exit if no response is needed
    }

    // Prepare to generate a response using the LLM (Large Language Model) interface if the LLM manager is available
    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager is currently busy.");
        return;  // Exit if the LLM manager is busy
    }

    try {
        const channelId = originalMsg.getChannelId();
        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, channelId, historyMessages);
        logger.debug(`[messageHandler] Request body for LLM prepared: ${JSON.stringify(requestBody, null, 2)}`);

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();

        if (typeof responseContent !== 'string' || !responseContent.trim()) {
            logger.error(`[messageHandler] Invalid LLM response content received: ${JSON.stringify(responseContent)}`);
            return;
        }

        logger.debug(`[messageHandler] LLM response received: ${responseContent.substring(0, 50)}...`);
        
        if (responseContent.length > 100) {
            logger.info("[messageHandler] Message exceeds 100 characters. Summarizing.");
            responseContent = await summarizeMessage(responseContent);
        }

        await sendResponse(responseContent, channelId, startTime);
        logger.debug("[messageHandler] Response sent to the channel successfully.");

        // Handle follow-up interactions if enabled
        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("[messageHandler] Follow-up is enabled. Processing follow-up interaction.");
            const topic = originalMsg.getChannelTopic() || "General Discussion";  // Use a fallback topic if none is set
            await sendFollowUp(originalMsg, topic);
        }

    } catch (error) {
        logger.error(`[messageHandler] An error occurred while processing the message: ${error.message}`, { errorDetail: error, originalMsg });
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Processing complete. Elapsed time: ${processingTime}ms`);
    }
}

module.exports = { messageHandler };
