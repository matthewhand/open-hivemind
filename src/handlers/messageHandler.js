// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

async function messageHandler(originalMessage) {
    // Ensure the originalMessage provides necessary interfaces
    if (typeof originalMessage.getText !== 'function' ||
        typeof originalMessage.getChannelId !== 'function' ||
        typeof originalMessage.getAuthorId !== 'function') {
        logger.error("Message object does not implement required interface methods.");
        return;
    }

    const messageText = originalMessage.getText();
    logger.debug(`Received message: ${messageText || "Undefined Content"}`);

    if (!messageText.trim()) {
        logger.debug('Ignoring empty or undefined message.');
        return;
    }

    // Check if the message is from the bot itself to prevent self-response
    if (originalMessage.getAuthorId() === constants.CLIENT_ID && !constants.BOT_TO_BOT_MODE) {
        logger.debug('Ignoring message from the bot itself due to BOT_TO_BOT_MODE setting.');
        return;
    }

    const channelId = originalMessage.getChannelId();
    try {
        const history = await DiscordManager.getInstance().fetchMessages(channelId, 20);
        if (history.length === 0) {
            logger.warn('No message history available for context.');
            await DiscordManager.getInstance().sendResponse(channelId, "Sorry, I can't find any relevant history to respond to.");
            return;
        }

        const lmManager = LlmInterface.getManager();
        const lmRequestBody = lmManager.buildRequestBody(history);

        const response = await lmManager.sendRequest(lmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";

        await DiscordManager.getInstance().sendResponse(channelId, replyText);
        logger.info(`Replied to message in channel ${channelId} with: ${replyText}`);
    } catch (error) {
        logger.error(`Error processing message: ${error}`, { errorDetail: error });
        // Additional error handling logic could be implemented here
    }
}

module.exports = { messageHandler };
