const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const DiscordManager = require('../managers/DiscordManager');
const {
  processCommand,
  shouldProcessMessage,
  summarizeMessage
} = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');
const MessageResponseManager = require('../managers/MessageResponseManager').getInstance();

/**
 * Handles incoming Discord messages by processing commands, querying OpenAI for responses, and managing response timings.
 * @param {IMessage} originalMessage - The message object received from Discord.
 * @param {Array} historyMessages - An array of previous messages for context.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();
    const discordManager = DiscordManager.getInstance();
    const channelId = originalMessage.getChannelId();

    logger.debug(`[messageHandler] Starting processing for message: ${originalMessage.getText().substring(0, 50)}...`);

    if (!isValidMessage(originalMessage)) {
        logger.error('[messageHandler] Invalid message format.');
        return;
    }

    if (!rateLimiter.canSendMessage()) {
        logger.warn('[messageHandler] Rate limit exceeded, message skipped.');
        return;
    }

    if (await processCommand(originalMessage, commands)) {
        logger.debug('[messageHandler] Command processed, exiting early.');
        return;
    }

    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug('[messageHandler] Message processing criteria not met, skipping.');
        return;
    }

    await manageTypingAndDelay(channelId);

    const decision = await MessageResponseManager.shouldReplyToMessage(originalMessage);
    if (!decision.shouldReply) {
        logger.debug('[messageHandler] No reply necessary as per MessageResponseManager.');
        return;
    }

    const responseContent = await generateResponseContent(originalMessage, historyMessages, openAiManager);
    await MessageResponseManager.manageResponse(originalMessage, responseContent, decision.responseDelay);

    rateLimiter.addMessageTimestamp();
    logger.info(`[messageHandler] Completed in ${Date.now() - startTime}ms.`);
}

/**
 * Validates the structure and necessary methods of the message object.
 * @param {IMessage} message - The message object to validate.
 * @returns {boolean} - True if the message is valid, false otherwise.
 */
function isValidMessage(message) {
    return typeof message.getText === 'function' && typeof message.getChannelId === 'function';
}

/**
 * Manages typing indicators and introduces a delay simulating typing speed.
 * @param {string} channelId - The channel ID where the message was received.
 */
async function manageTypingAndDelay(channelId) {
    const discordManager = DiscordManager.getInstance();
    await waitForQuietTypingWindow(channelId, discordManager);
    discordManager.startTyping(channelId);
    await delay(getRandomDelay(constants.BOT_PRE_TYPING_DELAY_MIN_MS, constants.BOT_PRE_TYPING_DELAY_MAX_MS));
}

/**
 * Waits for a period of inactivity in typing before proceeding, to mimic natural pause in conversation.
 * @param {string} channelId - The ID of the channel to monitor for typing activity.
 * @param {DiscordManager} discordManager - Instance of DiscordManager to access typing timestamps.
 */
async function waitForQuietTypingWindow(channelId, discordManager) {
    let isQuiet = false;
    while (!isQuiet) {
        const lastTypingTime = discordManager.getLastTypingTimestamp(channelId);
        const timeSinceLastTyping = Date.now() - lastTypingTime;
        if (timeSinceLastTyping < constants.TYPING_QUIET_WINDOW_MS) {
            await delay(constants.BOT_LONG_TYPING_DELAY_MIN_MS);
        } else {
            isQuiet = true;
        }
    }
}

/**
 * Generates a random delay within specified bounds to simulate natural typing speed.
 * @param {number} minMs - Minimum milliseconds to delay.
 * @param {number} maxMs - Maximum milliseconds to delay.
 * @returns {number} - A randomly determined delay period within the given bounds.
 */
function getRandomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Pauses the execution for a specified duration. Used to simulate typing delays.
 * @param {number} ms - The delay duration in milliseconds.
 * @returns {Promise<void>} - A promise that resolves after the delay period.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates response content by querying OpenAI with the original message and historical context.
 * @param {IMessage} originalMessage - The original message object received from Discord.
 * @param {Array} historyMessages - Historical messages for context.
 * @param {OpenAiManager} openAiManager - The OpenAiManager instance for handling requests to OpenAI.
 * @returns {Promise<string>} - The generated response content from OpenAI.
 */
async function generateResponseContent(originalMessage, historyMessages, openAiManager) {
    const prompt = originalMessage.getText();
    logger.debug(`[messageHandler] Generating response for prompt: ${prompt}`);
    const requestBody = openAiManager.buildRequestBody(historyMessages, prompt);
    const aiResponse = await openAiManager.sendRequest(requestBody);
    return aiResponse.getContent() || "Sorry, I didn't get that.";
}

module.exports = { messageHandler };
