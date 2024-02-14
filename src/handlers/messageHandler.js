const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface'); 

async function messageHandler(message) {
    logger.debug(`Received message: ${message?.content ?? "Undefined Content"}`);

    if (!message?.content?.trim()) {
        logger.debug('Ignoring empty or undefined message.');
        return;
    }

    if (message?.author?.bot && !constants.BOT_TO_BOT_MODE) {
        logger.debug('Ignoring message from another bot due to BOT_TO_BOT_MODE setting or undefined author.');
        return;
    }

    let discordManager = DiscordManager.getInstance();
    
    try {
        // Attempt to lazily get the bot ID when needed
        const botId = await discordManager.getBotId();

        logger.info('Generating dynamic response...');
        const history = await discordManager.fetchMessages(message.channel.id, 20);

        if (!history.length) {
            logger.warn('No message history available for context.');
            await discordManager.sendResponse(message.channel.id, "Sorry, I can't find any relevant history to respond to.");
            return;
        }

        // Assuming getManager method of LlmInterface handles lazy loading or initialization of the LM manager
        const lmManager = LlmInterface.getManager(); 
        const lmRequestBody = lmManager.buildRequestBody(history.map(msg => ({
            role: msg.author.id === botId ? 'assistant' : 'user',
            content: msg.content
        })));

        const response = await lmManager.sendRequest(lmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";

        await discordManager.sendResponse(message.channel.id, replyText);
        logger.info(`Replied to message in channel ${message.channel.id} with: ${replyText}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
        if (discordManager) {
            await discordManager.sendResponse(message.channel.id, 'Sorry, I encountered an error processing your message.').catch(sendError => {
                logger.error(`Error sending error response to Discord: ${sendError.message}`);
            });
        }
    }
}

module.exports = { messageHandler };
