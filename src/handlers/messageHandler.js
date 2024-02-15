const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

async function messageHandler(originalMessage) {
    try {
        // Verify that the originalMessage implements the necessary methods
        if (typeof originalMessage.getText !== 'function' || 
            typeof originalMessage.getChannelId !== 'function' || 
            typeof originalMessage.isFromBot !== 'function') {
            throw new Error("Message object does not implement required interface methods.");
        }

        const messageText = originalMessage.getText();
        logger.debug(`Received message: ${messageText || "Undefined Content"}`);

        if (!messageText.trim()) {
            logger.debug('Ignoring empty or undefined message.');
            return;
        }

        if (originalMessage.isFromBot() && !constants.BOT_TO_BOT_MODE) {
            logger.debug('Ignoring message from another bot due to BOT_TO_BOT_MODE setting.');
            return;
        }

        const discordManager = DiscordManager.getInstance();
        const botId = await discordManager.getBotId();
        if (!botId) {
            throw new Error("Bot ID is undefined. Cannot proceed with message handling.");
        }

        const channelId = originalMessage.getChannelId();
        const history = await discordManager.fetchMessages(channelId, 20);
        if (!history || history.length === 0) {
            logger.warn('No message history available for context.');
            await discordManager.sendResponse(channelId, "Sorry, I can't find any relevant history to respond to.");
            return;
        }

        const lmManager = LlmInterface.getManager();
        const lmRequestBody = lmManager.buildRequestBody(history, botId);

        const response = await lmManager.sendRequest(lmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";

        await discordManager.sendResponse(channelId, replyText);
        logger.info(`Replied to message in channel ${channelId} with: ${replyText}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, { errorDetail: error });
        try {
            // Attempt to recover the channelId for error response, if possible
            const channelIdFallback = originalMessage.getChannelId?.();
            await discordManager.sendResponse(channelIdFallback, 'Sorry, I encountered an error processing your message.');
        } catch (sendError) {
            logger.error(`Error sending error response to Discord: ${sendError.message}`, { sendError });
        }
    }
}

module.exports = { messageHandler };
