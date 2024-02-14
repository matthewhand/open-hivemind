const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const constants = require('../config/constants'); // Make sure to require constants if you're using it

function getLmManager() {
    switch (constants.LLM_PROVIDER) {
        case 'OpenAI':
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

    logger.debug(`Processing message from ${message.author.id}: ${message.content}`);

    try {
        const discordManager = DiscordManager.getInstance();
        const botId = discordManager.getBotId(); // Assuming botId is available
        logger.debug(`Bot ID obtained: ${botId}`);

        const openAiManager = getLmManager(); // Use getLmManager to abstract the manager creation
        openAiManager.setBotId(botId); // Ensure botId is set if it's required

        logger.info('Generating dynamic response...');
        const history = await discordManager.fetchMessages(message.channel.id, 20);
        logger.debug(`Fetched ${history.length} historical messages`);

        const llmRequestBody = openAiManager.buildRequestBody(history);
        logger.debug(`LLM Request Body: ${JSON.stringify(llmRequestBody)}`);

        const response = await openAiManager.sendRequest(llmRequestBody);
        logger.debug(`LLM Response: ${JSON.stringify(response)}`);

        const replyText = response.choices?.[0]?.text ?? "I'm not sure how to respond to that.";
        await discordManager.sendResponse(message.channel.id, replyText);
        logger.info(`Replied to ${message.author.id} in ${message.channel.id}`);
    } catch (error) {
        logger.error(`Error processing message: ${error}`);
        await discordManager.sendResponse(message.channel.id, 'Sorry, I encountered an error.');
    }
}

module.exports = { messageHandler };
