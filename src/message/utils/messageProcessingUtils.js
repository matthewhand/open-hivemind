const logger = require('./logger');
const constants = require('../config/constants');
const CommandManager = require('../managers/CommandManager');
const OpenAiManager = require('../managers/OpenAiManager');

/**
 * Processes a command contained within a message. Identifies if the text is a command and, if so, executes it using the CommandManager.
 * 
 * @param {IMessage} message - The message object containing the potential command.
 * @returns {Promise<boolean>} - Returns true if a command was processed successfully, false otherwise.
 */
async function processCommand(message) {
    if (!message || typeof message.getText !== 'function') {
        logger.error('[processCommand] Invalid message object.');
        return false;
    }

    const text = message.getText().trim();
    if (!text.startsWith('!')) {
        logger.debug('[processCommand] No command prefix found.');
        return false;  // Not a command
    }

    const commandManager = new CommandManager();
    try {
        const commandResult = await commandManager.executeCommand(message);
        if (commandResult.success) {
            logger.info('[processCommand] Command \'' + commandResult.command + '\' executed successfully.');
            return true;
        } else {
            logger.error('[processCommand] Command \'' + commandResult.command + '\' failed with error: ' + commandResult.error);
            return false;
        }
    } catch (error) {
        logger.error('[processCommand] Exception while executing command: ' + error.message);
        throw error;  // Rethrow after logging to handle the exception further up the call stack
    }
}

/**
 * Summarizes a given text to a specified target size using the OpenAI API. This function is designed to reduce the length of responses or content that exceed Discord's message length limits.
 * 
 * @param {string} content - The content to be summarized.
 * @param {number} targetSize - The target size for the summary, typically the maximum token count acceptable by Discord.
 * @returns {Promise<string>} - The summarized text if successful, the original text otherwise.
 */
async function summarizeMessage(content, targetSize = constants.LLM_RESPONSE_MAX_TOKENS) {
    if (typeof content !== 'string') {
        logger.error('[summarizeMessage] Invalid content type: ' + typeof content);
        throw new Error('Content must be a string.');
    }

    const openAiManager = OpenAiManager.getInstance();
    try {
        const summary = await openAiManager.summarizeText(content, targetSize);
        logger.info('[summarizeMessage] Content summarized to ' + summary.length + ' characters.');
        return summary;
    } catch (error) {
        logger.error('[summarizeMessage] Failed to summarize content: ' + error.message + ', returning original content.');
        return content;  // Return the original content if summarization fails
    }
}

/**
 * Prepares the request body for the OpenAI API call, incorporating the provided message content,
 * channel history, and other contextual information.
 *
 * @param {string} prompt - The main content for the OpenAI prompt.
 * @param {string} [channelId=constants.CHANNEL_ID] - The ID of the Discord channel, defaults to a predefined channel ID.
 * @param {Array<Object>} [history=[]] - Historical messages to provide context, expected to be an array of message-like objects.
 * @returns {Promise<Object>} A configuration object containing the model, prompt, and settings for the API call.
 */
async function prepareMessageBody(prompt, channelId = constants.CHANNEL_ID, history = []) {
    if (typeof prompt !== 'string') {
        logger.error('[prepareMessageBody] Invalid prompt type: ' + typeof prompt);
        throw new Error('Prompt must be a string.');
    }

    if (typeof channelId !== 'string') {
        logger.error('[prepareMessageBody] Invalid channelId type: ' + typeof channelId);
        throw new Error('ChannelId must be a string.');
    }

    if (!Array.isArray(history)) {
        logger.error('[prepareMessageBody] Invalid history type: ' + typeof history);
        throw new Error('History must be an array.');
    }

    logger.debug('Preparing message body for channel ID: ' + channelId + ' with prompt: ' + prompt.substring(0, 50) + '...');

    return OpenAiManager.getInstance().buildRequestBody(history, prompt);
}

module.exports = {
    processCommand,
    summarizeMessage,
    prepareMessageBody
};
