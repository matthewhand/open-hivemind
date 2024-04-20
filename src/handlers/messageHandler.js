const IMessage = require('../interfaces/IMessage');
const CommandManager = require('../managers/CommandManager');
const MessageResponseManager = require('../managers/MessageResponseManager');
const LLMInterface = require('../interfaces/LLMInterface');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp, prepareMessageBody, summarizeMessage } = require('../utils/messageHandlerUtils');
const DiscordManager = require('../managers/DiscordManager');

/**
 * Handles incoming messages by determining if they are commands and processing them accordingly,
 * or using a fallback AI model to generate responses when needed.
 *
 * @param {IMessage} originalMsg - The message object received from the Discord server.
 * @param {IMessage[]} historyMessages - Array of historical IMessage instances for context.
 * @returns {Promise<void>} - Resolves when the message has been fully processed.
 */
async function messageHandler(originalMsg, historyMessages = []) {
    const startTime = Date.now();
    logger.debug(`[messageHandler] Started processing message ID: ${originalMsg.getMessageId()} at ${new Date(startTime).toISOString()}`);

    if (!(originalMsg instanceof IMessage)) {
        logger.error('[messageHandler] The provided message object does not conform to the IMessage interface.');
        return;
    }

    if (!originalMsg.getText().trim()) {
        logger.info("[messageHandler] Received an empty or whitespace-only message; no processing will be undertaken.");
        return;
    }

    const commandManager = new CommandManager();
    const text = originalMsg.getText().trim();

    // Attempt to parse and execute command
    if (commandManager.parseCommand(text)) {
        logger.debug("[messageHandler] Text recognized as a command, attempting to execute.");
        const commandResult = await commandManager.executeCommand(originalMsg);
        await DiscordManager.getInstance().sendResponse(originalMsg.getChannelId(), commandResult);
        logger.info("[messageHandler] Command executed and response sent to the channel.");
        return;
    }

    // If text is not a command, check if a generic AI-generated response is needed
    if (!MessageResponseManager.getInstance().shouldReplyToMessage(originalMsg)) {
        logger.info("[messageHandler] No AI response deemed necessary based on the content and context.");
        return;
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager is currently busy, unable to process AI response.");
        return;
    }

    try {
        const channelId = originalMsg.getChannelId();
        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, channelId, historyMessages);
        logger.debug(`[messageHandler] LLM request body prepared, sending request to LLM.`);

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();

        if (!responseContent.trim()) {
            logger.error("[messageHandler] LLM provided an empty or invalid response.");
            return;
        }

        logger.debug("[messageHandler] LLM response received, processing content for sending.");
        if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
            responseContent = await summarizeMessage(responseContent);
            logger.info("[messageHandler] LLM response exceeded maximum length and was summarized.");
        }

        await sendResponse(responseContent, channelId, startTime);
        logger.info("[messageHandler] LLM response sent to the channel successfully.");

        if (constants.FOLLOW_UP_ENABLED) {
            logger.info("[messageHandler] Follow-up enabled, initiating follow-up interaction.");
            await sendFollowUp(originalMsg, originalMsg.getChannelTopic() || "General Discussion");
        }
    } catch (error) {
        logger.error(`[messageHandler] Failed processing LLM response: ${error}`, { errorDetail: error, originalMsg });
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] Message processing completed in ${processingTime}ms.`);
    }
}

module.exports = { messageHandler };
