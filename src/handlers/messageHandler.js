const IMessage = require('../interfaces/IMessage');
const CommandManager = require('../managers/CommandManager');
const MessageResponseManager = require('../managers/MessageResponseManager');
const LLMInterface = require('../interfaces/LLMInterface');
const constants = require('../config/constants');
const logger = require('../utils/logger');
const { sendResponse, sendFollowUp, prepareMessageBody, summarizeMessage } = require('../utils/messageHandlerUtils');
const DiscordManager = require('../managers/DiscordManager');
const { isCommand } = require('../utils/commandManagerUtils');

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

    if (!validateMessage(originalMsg)) {
        return;  // Validation failed, exit the function
    }

    if (await processCommand(originalMsg)) {
        return;  // Command processed, exit the function
    }

    await processAIResponse(originalMsg, historyMessages, startTime);
}

/**
 * Validates the integrity and content of the message.
 * This function checks if the message object is correctly instantiated from the IMessage interface and if the text content is not empty.
 *
 * @param {IMessage} message - The message to validate.
 * @returns {boolean} - True if the message is valid, otherwise false.
 */
function validateMessage(message) {
    if (!(message instanceof IMessage)) {
        logger.error('[messageHandler] Invalid message object type.');
        return false;  // Message does not conform to the IMessage interface
    }
    if (!message.getText().trim()) {
        logger.info("[messageHandler] Empty message received; no action taken.");
        return false;  // Message is empty or contains only whitespace
    }
    return true;
}

/**
 * Attempts to process the message as a command by detecting command triggers and executing associated actions.
 * If the message starts with a command prefix, it delegates processing to the CommandManager.
 *
 * @param {IMessage} message - The message to process.
 * @returns {Promise<boolean>} - True if the message was a command and was processed, otherwise false.
 */
async function processCommand(message) {
    const text = message.getText().trim();
    if (!isCommand(text)) {
        return false;  // Text does not start with '!', not a command
    }

    logger.debug("[messageHandler] Command detected, processing...");
    const commandManager = new CommandManager();
    const commandResult = await commandManager.executeCommand(message);
    if (commandResult.success) {
        logger.info("[messageHandler] Command executed successfully, response sent.");
        await DiscordManager.getInstance().sendResponse(message.getChannelId(), commandResult.message);
    } else {
        logger.error("[messageHandler] Command execution failed: " + commandResult.error);
    }
    return true;
}

/**
 * Processes the message for an AI-generated response if applicable.
 * This function decides based on the context and content of the message whether to invoke the AI model for a response.
 *
 * @param {IMessage} message - The message to process.
 * @param {IMessage[]} historyMessages - Historical messages for context.
 * @param {number} startTime - The timestamp when the message processing started.
 */
async function processAIResponse(message, historyMessages, startTime) {
    if (!MessageResponseManager.getInstance().shouldReplyToMessage(message)) {
        logger.info("[messageHandler] No AI response deemed necessary based on the content and context.");
        return;  // No AI response is required for this message
    }

    const llmManager = LLMInterface.getManager();
    if (llmManager.isBusy()) {
        logger.info("[messageHandler] LLM Manager is currently busy, unable to process AI response.");
        return;  // LLM is busy, cannot process AI response now
    }

    try {
        const channelId = message.getChannelId();
        const requestBody = await prepareMessageBody(constants.LLM_SYSTEM_PROMPT, channelId, historyMessages);
        logger.debug(`[messageHandler] LLM request body prepared, sending request to LLM.`);

        const llmResponse = await llmManager.sendRequest(requestBody);
        let responseContent = llmResponse.getContent();  // This is a critical point where the error might occur if getContent() does not return a string.

        // Potential Fix: Ensure responseContent is a string
        if (typeof responseContent !== 'string') {
            logger.error("[messageHandler] Error: Expected string from LLM response, received type: " + typeof responseContent);
            responseContent = "";  // Default to empty string if not a string type
        }

        if (!responseContent.trim()) {
            logger.error("[messageHandler] LLM provided an empty or invalid response.");
            return;  // LLM response is empty or invalid
        }

        logger.debug("[messageHandler] LLM response received, processing content for sending.");
        if (responseContent.length > constants.MAX_MESSAGE_LENGTH) {
            responseContent = await summarizeMessage(responseContent);
            logger.info("[messageHandler] LLM response exceeded maximum length and was summarized.");
        }

        await sendResponse(responseContent, channelId, startTime);
        logger.info("[messageHandler] LLM response sent to the channel successfully.");

        if (constants.FOLLOW_UP_ENABLED) {
            await sendFollowUp(message, message.getChannelTopic() || "General Discussion");
            logger.debug("[messageHandler] Follow-up interaction initiated.");
        }
    } catch (error) {
        logger.error(`[messageHandler] Error processing LLM response: ${error.message}`, { originalMsg: message, error });
    } finally {
        const processingTime = Date.now() - startTime;
        logger.info(`[messageHandler] AI message processing completed in ${processingTime}ms.`);
    }
}

module.exports = { messageHandler };
