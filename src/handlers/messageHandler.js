const logger = require('../utils/logger');
const openAiManager = require('../managers/OpenAiManager').getInstance();
const DiscordManager = require('../managers/DiscordManager');
const messageResponseManager = require('../managers/MessageResponseManager').getInstance();
const { processCommand, shouldProcessMessage } = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');

/**
 * Processes incoming Discord messages by checking commands, querying OpenAI for responses, managing response timings, and simulating human-like typing delays.
 * @param {IMessage} originalMessage - The message object received from Discord.
 * @param {Array<IMessage>} historyMessages - An array of previous messages for context.
 * @returns {Promise<void>} Completes when the message has been fully processed.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now(); // Define startTime to calculate processing duration later

    logger.debug(`[messageHandler] Starting processing for message: ${originalMessage.getText().substring(0, 50)}...`);

    if (!isValidMessage(originalMessage)) {
        logger.error('[messageHandler] Invalid message format or content.');
        return;
    }

    if (await processCommand(originalMessage, commands)) {
        logger.info('[messageHandler] Command processed, exiting early.');
        return;
    }

    if (!rateLimiter.canSendMessage(originalMessage.getChannelId())) {
        logger.warn('[messageHandler] Rate limit exceeded, message skipped.');
        return;
    }

    if (!shouldProcessMessage(originalMessage)) {
        logger.info('[messageHandler] Message does not meet processing criteria.');
        return;
    }

    const typingDelay = await manageTypingAndDelay(originalMessage.getChannelId());
    logger.debug("[messageHandler] Typing delay managed.", { typingDelay });

    const decision = await messageResponseManager.shouldReplyToMessage(originalMessage);
    if (!decision) {
        logger.info("[messageHandler] No reply necessary as per messageResponseManager.");
        return;
    }

    const responseContent = await generateResponseContent(originalMessage, historyMessages);
    if (responseContent.trim()) {
        logger.info("[messageHandler] Sending response message.");
        await DiscordManager.getInstance().sendMessage(originalMessage.getChannelId(), responseContent);
        logger.info("[messageHandler] Response message sent.");
    } else {
        logger.info("[messageHandler] Generated response content was empty, no message sent.");
    }

    rateLimiter.addMessageTimestamp();
    logger.info(`[messageHandler] Handler completed in ${Date.now() - startTime}ms.`);
}

/**
 * Validates the structure and content of the message.
 * @param {IMessage} message - The message to validate.
 * @returns {boolean} True if the message is valid, false otherwise.
 */
function isValidMessage(message) {
    return message && typeof message.getText === 'function' && message.getText().trim().length > 0;
}

/**
 * Manages typing indications and delays by simulating typing to reflect a more human-like interaction.
 * @param {string} channelId - The ID of the Discord channel.
 * @returns {Promise<number>} The delay time in milliseconds.
 */
async function manageTypingAndDelay(channelId) {
    const lastMessageTime = DiscordManager.getInstance().getLastMessageTimestamp(channelId);
    const timeSinceLastMessage = Date.now() - lastMessageTime;
    if (timeSinceLastMessage < constants.TYPING_QUIET_WINDOW_MS) {
        await delay(constants.BOT_LONG_TYPING_DELAY_MIN_MS);
    }

    // TODO figure out why this isnt exposed (?)
    // const discordManager = DiscordManager.getInstance();
    // await discordManager.startTyping(channelId);

    const delayTime = getRandomDelay(constants.BOT_TYPING_DELAY_MIN_MS, constants.BOT_TYPING_DELAY_MAX_MS);
    await delay(delayTime);
    // DiscordManager.getInstance().stopTyping(channelId);
    return delayTime;
}

/**
 * Generates the content for the response using OpenAI based on the conversation context provided by the original and historical messages.
 * @param {IMessage} originalMessage - The original Discord message.
 * @param {Array<IMessage>} historyMessages - An array of historical messages for context.
 * @returns {Promise<string>} The response content from OpenAI.
 */
async function generateResponseContent(originalMessage, historyMessages) {
    logger.debug("Starting to generate response content...");

    // Log initial message context for debugging
    logger.debug(`Original Message: ${originalMessage.getText()}`);
    historyMessages.forEach((msg, index) => {
        logger.debug(`History Message ${index + 1}: ${msg.getText()} from ${msg.isFromBot() ? 'Bot' : 'User'}`);
    });

    // Building the request body for OpenAI API call
    const requestBody = openAiManager.buildRequestBody([originalMessage, ...historyMessages], constants.LLM_SYSTEM_PROMPT);
    logger.debug(`Request Body for OpenAI: ${JSON.stringify(requestBody)}`);

    try {
        // Sending the request to OpenAI and getting the response
        const response = await openAiManager.sendRequest(requestBody);
        logger.debug("Received response from OpenAI");

        if (!response.getContent() || response.getContent().trim() === "") {
            logger.warn("OpenAI response content is empty or whitespace.");
        }

        return response.getContent();
    } catch (error) {
        // Logging error if the request fails
        logger.error("Failed to send request or process the response properly", { error: error, requestBody: requestBody });
        throw new Error("Error in generating response content: " + error.message);
    }
}

/**
 * Introduces a pause for a specified duration.
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Returns a random delay within the specified range.
 * @param {number} minMs - Minimum milliseconds of delay.
 * @param {number} maxMs - Maximum milliseconds of delay.
 * @returns {number} The randomly determined delay time.
 */
function getRandomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

module.exports = { messageHandler };
