const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

async function messageHandler(originalMessage) {
    logger.debug(`Received message: ${originalMessage.getText() ?? "Undefined Content"}`);

    if (!originalMessage.getText().trim()) {
        logger.debug('Ignoring empty or undefined message.');
        return;
    }

    if (originalMessage.isFromBot() && !constants.BOT_TO_BOT_MODE) {
        logger.debug('Ignoring message from another bot due to BOT_TO_BOT_MODE setting.');
        return;
    }

    const discordManager = DiscordManager.getInstance();

    try {
        const botId = await discordManager.getBotId();
        const history = await discordManager.fetchMessages(originalMessage.getChannelId(), 20);

        if (!history.length) {
            logger.warn('No message history available for context.');
            await discordManager.sendResponse(originalMessage.getChannelId(), "Sorry, I can't find any relevant history to respond to.");
            return;
        }

        const lmManager = LlmInterface.getManager();
        const lmRequestBody = lmManager.buildRequestBody(history, botId);

        const response = await lmManager.sendRequest(lmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";

        await discordManager.sendResponse(originalMessage.getChannelId(), replyText);
        logger.info(`Replied to message in channel ${originalMessage.getChannelId()} with: ${replyText}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
        try {
            await discordManager.sendResponse(originalMessage.getChannelId(), 'Sorry, I encountered an error processing your message.');
        } catch (sendError) {
            logger.error(`Error sending error response to Discord: ${sendError.message}`);
        }
    }
}

module.exports = { messageHandler };
