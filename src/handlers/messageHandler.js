// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

/**
 * Handles incoming messages by processing them and generating responses.
 * @param {IMessage} originalMessage - The message to handle, which must implement the IMessage interface.
 */
async function messageHandler(originalMessage) {
    // Validate the message against the IMessage interface.
    if (!originalMessage.getText || !originalMessage.getChannelId || !originalMessage.getAuthorId) {
        logger.error("Provided message does not conform to IMessage interface.");
        return;
    }

    const messageText = originalMessage.getText();
    if (!messageText.trim()) {
        logger.debug("Ignoring blank or whitespace-only messages.");
        return;
    }

    // Avoid processing messages sent by the bot itself, unless BOT_TO_BOT_MODE is enabled.
    if (originalMessage.getAuthorId() === constants.CLIENT_ID && !constants.BOT_TO_BOT_MODE) {
        logger.debug("Skipping bot's own messages.");
        return;
    }

    // Fetch the message history for context.
    const channelId = originalMessage.getChannelId();
    const history = await DiscordManager.getInstance().fetchMessages(channelId, 20); // Assuming fetchMessages returns an array of IMessage instances.
    if (history.length === 0) {
        logger.warn("No historical messages found for context.");
        await DiscordManager.getInstance().sendResponse(channelId, "I'm unable to provide context-based responses without message history.");
        return;
    }

    // Prepare the request for the language model.
    const lmManager = LlmInterface.getManager();
    const requestBody = lmManager.prepareRequestData(originalMessage, history);

    try {
        const responseContent = await lmManager.sendRequest(requestBody);
        await DiscordManager.getInstance().sendResponse(channelId, responseContent);
        logger.info(`Response sent for message in channel ${channelId}.`);
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
        // Implement retry logic, notification, or other error handling as needed.
    }
}

module.exports = { messageHandler };
