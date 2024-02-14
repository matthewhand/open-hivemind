// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');

// Dynamically select the LM manager based on the configured provider
function getllmManager() {
    switch (constants.LLM_PROVIDER) {
        case 'OpenAI':
            const OpenAiManager = require('../managers/OpenAiManager');
            return new OpenAiManager();
        default:
            logger.error(`Unsupported LLM Provider specified in constants: ${constants.LLM_PROVIDER}`);
            throw new Error('Unsupported LLM Provider');
    }
}

async function messageHandler(message) {
    if (message.author.bot || !message.content.trim()) {
        logger.debug('Ignoring bot message or empty message.');
        return;
    }

    try {
        const discordManager = DiscordManager.getInstance();
        const botId = discordManager.getBotId(); // Use the bot ID from DiscordManager

        logger.info('Generating dynamic response...');
        const history = await discordManager.fetchMessages(message.channel.id, 20);

        const llmManager = getllmManager(); // Dynamically get the LM manager

        const llmRequestBody = llmManager.buildRequestBody(history.map(msg => ({
            role: msg.author.id === botId ? 'assistant' : 'user',
            content: msg.content
        })));

        const response = await llmManager.sendRequest(llmRequestBody);
        const replyText = response.choices?.[0]?.message?.content ?? "I'm not sure how to respond to that.";
        await discordManager.sendResponse(message.channel.id, replyText);
        logger.info(`Replied to message in channel ${message.channel.id}`);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
        await DiscordManager.getInstance().sendResponse(message.channel.id, 'Sorry, I encountered an error.'); // Ensure discordManager is accessible here
    }
}

module.exports = { messageHandler };
