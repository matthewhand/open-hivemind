// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');

function getLmManager() {
    switch (constants.LLM_PROVIDER) {
        case 'OpenAI':
            const OpenAiManager = require('../managers/oaiApiManager');
            return new OpenAiManager();
        // Add other cases as necessary
        default:
            logger.error('Unsupported LLM Provider specified in constants');
            throw new Error('Unsupported LLM Provider');
    }
}

const llmManager = getLmManager();

async function messageHandler(message) {
    if (message.author.bot || !message.content.trim()) {
        logger.debug('Ignoring bot message or empty message.');
        return;
    }

    try {
        logger.info('Generating dynamic response...');
        const discordManager = DiscordManager.getInstance();
        let history = await discordManager.fetchMessages(message.channel.id);

        // Assuming buildRequestBody is a synchronous operation
        // Replace with actual implementation details
        const requestBody = {
            model: "gpt-3.5-turbo",
            prompt: message.content, // Use actual message content
            max_tokens: 100,
        };
        logger.debug(`Request body: ${JSON.stringify(requestBody)}`);

        // Assuming sendRequest is properly mocked and returns a mock response
        const response = await llmManager.sendRequest(requestBody);
        logger.debug(`LM response: ${JSON.stringify(response)}`);

        const replyText = response.choices?.[0]?.text ?? "I'm not sure how to respond to that.";
        logger.debug(`Sending reply: ${replyText}`);
        await discordManager.sendResponse(message.channel.id, replyText);
    } catch (error) {
        logger.error(`Error processing message: ${error}`);
        await DiscordManager.getInstance().sendResponse(message.channel.id, 'Sorry, I encountered an error.');
    }
}


module.exports = { messageHandler };
