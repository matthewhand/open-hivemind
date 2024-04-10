const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const DiscordManager = require('../managers/DiscordManager');
const { processCommand, shouldProcessMessage } = require('../utils/messageHandlerUtils');
const commands = require('../commands/inline');
const constants = require('../config/constants');
const rateLimiter = require('../utils/rateLimiter');
const MessageResponseManager = require('../managers/MessageResponseManager').getInstance();

/**
 * Handles incoming Discord messages by processing commands, querying OpenAI for responses, and managing response timings.
 * @param {IMessage} originalMessage - The message object received from Discord.
 * @param {Array} historyMessages - An array of previous messages for context.
 * @async
 * @returns {Promise<void>}
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

    await manageTypingAndDelay(channelId, discordManager);

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
 * Validates the structure and necessary methods of the message object to ensure it can be processed.
 * @param {IMessage} message - The message object to validate.
 * @returns {boolean} True if the message object has the necessary methods, false otherwise.
 */
function isValidMessage(message) {
    return typeof message.getText === 'function' && typeof message.getChannelId === 'function';
}

/**
 * Manages typing indicators and delays to simulate natural typing speed, enhancing user interaction realism.
 * @param {string} channelId - The channel ID where the message was received.
 * @param {DiscordManager} discordManager - The DiscordManager instance to manage typing indicators.
 * @async
 * @returns {Promise<void>}
 */
async function manageTypingAndDelay(channelId, discordManager) {
    await waitForQuietTypingWindow(channelId, discordManager);
    discordManager.startTyping(channelId);
    await delay(getRandomDelay(constants.BOT_PRE_TYPING_DELAY_MIN_MS, constants.BOT_PRE_TYPING_DELAY_MAX_MS));
}

/**
 * Waits until there is no recent typing activity in the channel to continue, simulating thoughtful pause in conversation.
 * @param {string} channelId - The ID of the channel to monitor for typing activity.
 * @param {DiscordManager} discordManager - Instance of DiscordManager to access typing timestamps.
 * @async
 * @returns {Promise<void>}
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
 * Generates a random delay within specified bounds to simulate typing speed, adding to the realism of bot interactions.
 * @param {number} minMs - Minimum milliseconds to delay.
 * @param {number} maxMs - Maximum milliseconds to delay.
 * @returns {number} A randomly determined delay period within the specified bounds.
 */
function getRandomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Delays the execution for a specified duration, used mainly to manage pacing in bot responses.
 * @param {number} ms - The milliseconds to delay execution by.
 * @returns {Promise<void>} A promise that resolves after the specified delay, simulating typing or processing delay.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Constructs and sends a request to OpenAI based on the original message and historical context, retrieving a generated response.
 * @param {IMessage} originalMessage - The original Discord message.
 * @param {Array} historyMessages - Contextual messages that precede the original message.
 * @param {OpenAiManager} openAiManager - The manager handling interactions with OpenAI's API.
 * @async
 * @returns {Promise<string>} The text response generated by OpenAI, or an error message if the process fails.
 */
async function generateResponseContent(originalMessage, historyMessages, openAiManager) {
    const prompt = originalMessage.getText();
    logger.debug(`[messageHandler] Generating response for prompt: ${prompt}`);
    const requestBody = openAiManager.buildRequestBody(historyMessages, prompt);
    const aiResponse = await openAiManager.sendRequest(requestBody);
    return aiResponse.getContent() || "Sorry, I didn't get that.";
}

module.exports = { messageHandler };
