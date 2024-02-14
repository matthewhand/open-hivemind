const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const constants = require('../config/constants');

function getLmManager() {
    switch (constants.LLM_PROVIDER) {
        case 'OpenAI':
            const OpenAiManager = require('../managers/oaiApiManager');
            return new OpenAiManager();
        default:
            logger.error('Unsupported LLM Provider specified in constants');
            throw new Error('Unsupported LLM Provider');
    }
}

async function messageHandler(message) {
    if (message.author.bot || !message.content.trim()) {
        logger.debug('Ignoring bot message or empty message.');
        return;
    }

    const discordManager = DiscordManager.getInstance();
    const llmManager = getLmManager(); // Dynamically select the LLM manager

    try {
        logger.info('Generating dynamic response...');

        // Fetch recent messages for context, ensuring to exclude the bot's messages from the history
        const history = await discordManager.fetchMessages(message.channel.id, 20); // Example: fetch last 20 messages
        // No need to filter current message since we're excluding bot messages in fetchMessages now

        // Pass both the history and the user message to the LLM manager
        const llmRequestBody = llmManager.buildRequestBody(history, message.content);
        const response = await llmManager.sendRequest(llmRequestBody);

        // Parse the response and send it back in Discord
        const replyText = response.choices?.[0]?.text ?? "I'm not sure how to respond to that.";
        await discordManager.sendResponse(message.channel.id, replyText);

    } catch (error) {
        logger.error(`Error processing message: ${error}`);
        await discordManager.sendResponse(message.channel.id, 'Sorry, I encountered an error.');
    }
}

module.exports = { messageHandler };
