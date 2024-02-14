const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface'); // Assuming LlmInterface includes a getManager method

async function messageHandler(message) {
    logger.debug(`Received message: ${message?.content ?? "Undefined Content"}`);

    if (!(message?.content?.trim())) {
        logger.debug('Ignoring empty or undefined message.');
        return;
    }

    if (message?.author?.bot && !constants.BOT_TO_BOT_MODE) {
        logger.debug('Ignoring message from another bot due to BOT_TO_BOT_MODE setting or undefined author.');
        return;
    }

    let discordManager;
    try {
        discordManager = DiscordManager.getInstance();
        const botId = discordManager?.getBotId?.();

        if (!botId) {
            logger.error('Bot ID is not available or undefined. Ensure the Discord client is ready.');
            return;
        }

        logger.info('Generating dynamic response...');
        const history = await discordManager?.fetchMessages?.(message?.channel?.id, 20);

        if (!(history?.length)) {
            logger.warn('No message history available for context or history is undefined.');
            await discordManager?.sendResponse?.(message?.channel?.id, "Sorry, I can't find any relevant history to respond to or channel is undefined.");
            return;
        }

        const lmManager = LlmInterface.getManager?.(); // Utilize the static method to obtain an LM manager instance
        const lmRequestBody = lmManager?.buildRequestBody?.(history.map(msg => ({
            role: msg?.author?.id === botId ? 'assistant' : 'user',
            content: msg?.content ?? "Undefined message content"
        })));

        const response = await lmManager?.sendRequest?.(lmRequestBody);
        const replyText = response?.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that or response is undefined.";

        await discordManager?.sendResponse?.(message?.channel?.id, replyText);
        logger.info(`Replied to message in channel ${message?.channel?.id ?? "Undefined Channel"} with: ${replyText}`);
    } catch (error) {
        logger.error(`Error processing message: ${error?.message ?? "Undefined Error"}`);
        try {
            if (discordManager) {
                await discordManager?.sendResponse?.(message?.channel?.id, 'Sorry, I encountered an error processing your message.');
            }
        } catch (sendError) {
            logger.error(`Error sending error response to Discord: ${sendError?.message ?? "Undefined Send Error"}`);
        }
    }
}

module.exports = { messageHandler };
