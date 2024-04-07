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
    // Record the start time for processing diagnostics
    const startTime = Date.now();
    // Singleton instances of the OpenAI manager and Discord manager for API interactions
    const openAiManager = OpenAiManager.getInstance();
    // Extract the channel ID from the original message for later use
    const channelId = originalMessage.channel.id;

    // Validate the message to ensure it meets the requirements for processing
    if (!originalMessageValid(originalMessage)) {
        logger.error(`[messageHandler] Invalid message format.`);
        return; // Exit if the message does not have the required structure or methods
    }

    // Attempt to process any commands in the message, exiting early if a command is successfully executed
    if (await processCommand(originalMessage, commands)) {
        logger.debug("[messageHandler] Command processed.");
        return; // Command has been processed, no further action required
    }

    // Check if the message should be further processed or skipped (e.g., bot messages)
    if (!await shouldProcessMessage(originalMessage, openAiManager)) {
        logger.debug("[messageHandler] Message processing skipped.");
        return; // Criteria for processing not met, skip this message
    }

    // Enforce rate limits to prevent spam or abuse
    if (!rateLimiter.canSendMessage()) {
        logger.warn('[messageHandler] Exceeded message rate limit.');
        return; // Exit handling if rate limits are exceeded
    }

    // Initiate the request to OpenAI for processing the message without waiting here
    const aiResponsePromise = openAiManager.sendRequest(openAiManager.buildRequestBody(historyMessages, constants.LLM_SYSTEM_PROMPT));
    // Indicate the bot is now busy responding to a request
    openAiManager.setIsResponding(true);

    // A sophisticated delay mechanism waits for a suitable window to simulate typing
    await waitForQuietTypingWindow(channelId);

    // Simulates bot typing in the channel to provide a natural interaction feel
    DiscordManager.startTyping(channelId);
    // A brief pause to simulate the bot "thinking" before sending the message
    await delay(getRandomDelay(constants.BOT_PRE_TYPING_DELAY_MIN_MS, constants.BOT_PRE_TYPING_DELAY_MAX_MS));

    // Wait for the AI's response that was requested earlier
    const llmResponse = await aiResponsePromise; 
    let messageContent = llmResponse instanceof LLMResponse ? llmResponse.getContent() : "Sorry, I didn't get that.";

    // Optionally summarize the message content based on certain criteria
    if (shouldSummarize(llmResponse)) {
        messageContent = await summarizeMessage(messageContent);
    }

    // Sends the processed or summarized message content as a response
    await sendResponse(channelId, messageContent);
    // Stops the typing indicator once the message is ready to be sent
    DiscordManager.stopTyping(channelId);

    // Perform any follow-up actions necessary after sending the message
    if (await handleFollowUp(originalMessage)) {
        logger.debug('[messageHandler] Follow-up action completed.');
    }

    // Update rate limiting tracking and reset the responding status
    rateLimiter.addMessageTimestamp();
    openAiManager.setIsResponding(false);
    // Log the completion of message processing, including how long it took
    logger.info(`[messageHandler] Message handling complete. Processing time: ${Date.now() - startTime}ms.`);
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
