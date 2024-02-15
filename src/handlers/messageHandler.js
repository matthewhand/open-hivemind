// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const OpenAiManager = require('../managers/OpenAiManager');

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

    // Fetch the message history for context, if required by the OpenAiManager.
    const lmManager = new OpenAiManager(); // Instantiate the OpenAiManager
    const channelId = originalMessage.getChannelId();
    let history = [];
    if (lmManager.requiresHistory()) {
        history = await DiscordManager.getInstance().fetchMessages(channelId, 20); // Assuming fetchMessages returns an array of IMessage instances.
    }

    // Build the request body with the original message and history.
    const requestBody = lmManager.buildRequestBody([originalMessage, ...history]);

    try {
        // Send the request to the OpenAI API and wait for the response.
        const responseContent = await lmManager.sendRequest(requestBody);
        // Assuming the response structure allows direct usage, modify as needed based on actual API response.
        await DiscordManager.getInstance().sendResponse(channelId, responseContent.choices[0].text);
        logger.info(`Response sent for message in channel ${channelId}.`);
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
        // Implement retry logic, notification, or other error handling as needed.
    }
}

module.exports = { messageHandler };
