// Required modules and managers for handling messages, logging, and interaction with OpenAI and Discord
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const DiscordManager = require('../managers/DiscordManager');
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
const LLMResponse = require('../interfaces/LLMResponse');

/**
 * Main handler for incoming Discord messages. It orchestrates the process of validating messages,
 * executing commands, querying OpenAI for responses, and managing typing indicators for a more
 * human-like interaction.
 *
 * @param {IMessage} originalMessage - The Discord message object to be processed.
 * @param {Array} historyMessages - An array containing the history of messages for context.
 */
async function messageHandler(originalMessage, historyMessages = []) {
    const startTime = Date.now();
    const openAiManager = OpenAiManager.getInstance();
    const channelId = originalMessage.getChannelId();

    logger.debug(`[messageHandler] Starting processing for message: ${originalMessage.getText().substring(0, 50)}...`);

    if (!originalMessageValid(originalMessage)) {
        logger.error(`[messageHandler] Invalid message format.`);
        return;
    }

    if (await processCommand(originalMessage, commands)) {
        logger.debug("[messageHandler] Command processed, exiting early.");
        return;
    }

    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug("[messageHandler] Message processing criteria not met, skipping.");
        return;
    }

    if (!rateLimiter.canSendMessage()) {
        logger.warn('[messageHandler] Rate limit exceeded, message skipped.');
        return;
    }

    logger.debug("[messageHandler] Sending request to OpenAI.");
    const aiResponsePromise = openAiManager.sendRequest(openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT));
    openAiManager.setIsResponding(true);

    await waitForQuietTypingWindow(channelId);
    DiscordManager.startTyping(channelId);
    await delay(getRandomDelay(constants.BOT_PRE_TYPING_DELAY_MIN_MS, constants.BOT_PRE_TYPING_DELAY_MAX_MS));

    const llmResponse = await aiResponsePromise;
    let messageContent = llmResponse.getContent() || "Sorry, I didn't get that.";
    logger.debug(`[messageHandler] Received response from OpenAI: ${messageContent.substring(0, 50)}...`);

    if (shouldSummarize(llmResponse)) {
        messageContent = await summarizeMessage(messageContent);
        logger.debug("[messageHandler] Message summarized.");
    }

    await sendResponse(channelId, messageContent);
    DiscordManager.stopTyping(channelId);

    if (await handleFollowUp(originalMessage)) {
        logger.debug('[messageHandler] Completed follow-up actions.');
    }

    rateLimiter.addMessageTimestamp();
    openAiManager.setIsResponding(false);
    logger.info(`[messageHandler] Completed in ${Date.now() - startTime}ms.`);
}

/**
 * Validates the structure and methods of the original message to ensure it meets processing requirements.
 * @param {IMessage} originalMessage - The message object to validate.
 * @return {boolean} True if valid, false otherwise.
 */
function originalMessageValid(originalMessage) {
    return typeof originalMessage.getText === 'function' &&
           typeof originalMessage.getChannelId === 'function';
}

/**
 * Determines whether the response from OpenAI should be summarized based on predefined criteria.
 * @param {LLMResponse} llmResponse - The response object from OpenAI.
 * @return {boolean} True if summarization is needed, false otherwise.
 */
function shouldSummarize(llmResponse) {
    return constants.LLM_ALWAYS_SUMMARISE || (llmResponse.getCompletionTokens() > constants.LLM_RESPONSE_MAX_TOKENS);
}

/**
 * Waits for a window of time where no recent typing has been detected in a channel.
 * If typing is detected during the initial wait, extends the wait with longer delays until a quiet window is found.
 * @param {string} channelId - The ID of the channel to check for recent typing.
 */
async function waitForQuietTypingWindow(channelId) {
    let isQuiet = false;
    while (!isQuiet) {
        const lastTypingTime = DiscordManager.getLastTypingTimestamp(channelId);
        const timeSinceLastTyping = Date.now() - lastTypingTime;
        
        if (timeSinceLastTyping < constants.TYPING_QUIET_WINDOW_MS) {
            // If recent typing is detected, wait for a longer period
            await delay(getRandomDelay(constants.BOT_LONG_TYPING_DELAY_MIN_MS, constants.BOT_LONG_TYPING_DELAY_MAX_MS));
        } else {
            // If a quiet window is detected, prepare for a final short delay
            await delay(getRandomDelay(constants.BOT_SHORT_TYPING_DELAY_MIN_MS, constants.BOT_SHORT_TYPING_DELAY_MAX_MS));
            isQuiet = true;
        }
    }
}

/**
 * Generates a random delay duration within the specified minimum and maximum bounds.
 * @param {number} minMs - The minimum delay in milliseconds.
 * @param {number} maxMs - The maximum delay in milliseconds.
 * @return {number} A random delay duration within the specified bounds.
 */
function getRandomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Delays the execution of subsequent code for a specified duration.
 * @param {number} ms - The delay duration in milliseconds.
 * @return {Promise<void>} A promise that resolves after the delay period.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { messageHandler };
