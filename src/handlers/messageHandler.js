const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const constants = require('../config/constants');

async function messageHandler(originalMessage) {
    logger.debug(`Original message author ID: ${originalMessage.getAuthorId()}`);

    // Validate the message against the IMessage interface
    if (!originalMessage.getText || !originalMessage.getChannelId || !originalMessage.getAuthorId) {
        logger.error("Provided message does not conform to IMessage interface.");
        return;
    }

    const messageText = originalMessage.getText();
    if (!messageText.trim()) {
        logger.debug("Ignoring blank or whitespace-only messages.");
        return;
    }

    // Always ignore the bot's own messages
    if (originalMessage.getAuthorId() === constants.CLIENT_ID) {
        logger.debug("Skipping bot's own messages.");
        return;
    }

    const lmManager = new OpenAiManager();
    const channelId = originalMessage.getChannelId();
    let history = [];
    if (lmManager.requiresHistory()) {
        history = await DiscordManager.getInstance().fetchMessages(channelId, 20);
        if (history && history.length) {
            history.reverse(); // Ensure recent messages are at the bottom
            logger.debug(`Fetched and reversed history for channel ${channelId}: ${history.length} messages`);
        } else {
            logger.debug(`No message history found for channel ${channelId}`);
        }
    }

    const requestBody = lmManager.buildRequestBody([originalMessage, ...history]);
    logger.debug(`Request body for OpenAI API: ${JSON.stringify(requestBody, null, 2)}`);

    try {
        const responseContent = await lmManager.sendRequest(requestBody);
        
        // Check if response structure is as expected
        if (!responseContent || !responseContent.choices || !responseContent.choices.length || !responseContent.choices[0].message) {
            logger.error(`Unexpected response structure from OpenAI API for channel ${channelId}.`);
            return;
        }

        const messageToSend = responseContent.choices[0].message.content;
        logger.debug(`Message to be sent to Discord: "${messageToSend}"`);

        if (!messageToSend.trim()) {
            logger.error(`Received empty response content from OpenAI API for channel ${channelId}.`);
            return; // Prevent sending an empty message to Discord
        }

        await DiscordManager.getInstance().sendResponse(channelId, messageToSend);
        logger.info(`Response sent for message in channel ${channelId}: "${messageToSend}"`);
    } catch (error) {
        logger.error(`Failed to process message for channel ${channelId}: ${error}`, { errorDetail: error });
    }
}

module.exports = { messageHandler };
