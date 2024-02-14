const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');

// Dynamically select the LM manager based on the configured provider
function getLmManager() {
    try {
        switch (constants.LLM_PROVIDER) {
            case 'OpenAI':
                const OpenAiManager = require('../managers/OpenAiManager');
                return new OpenAiManager();
            default:
                throw new Error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
        }
    } catch (error) {
        logger.error(`Error loading LM Manager: ${error.message}`);
        throw error; // Re-throw the error to be caught in the catch block of messageHandler
    }
}

async function messageHandler(message) {
    if (message.author.bot || !message.content.trim()) {
        logger.debug('Ignoring bot message or empty message.');
        return;
    }

    try {
        const discordManager = DiscordManager.getInstance();
        const botId = discordManager.getBotId();
        if (!botId) {
            logger.error('Bot ID is not available. Make sure the Discord client is ready.');
            return;
        }

        logger.info('Generating dynamic response...');
        const history = await discordManager.fetchMessages(message.channel.id, 20);

        const lmManager = getLmManager();
        const lmRequestBody = lmManager.buildRequestBody(history.map(msg => ({
            role: msg.author.id === botId ? 'assistant' : 'user',
            content: msg.content
        })));

        const response = await lmManager.sendRequest(lmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";
        await discordManager.sendResponse(message.channel.id, replyText);
        logger.info(`Replied to message in channel ${message.channel.id}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
        await discordManager.sendResponse(message.channel.id, 'Sorry, I encountered an error.');
    }
}

module.exports = { messageHandler };
