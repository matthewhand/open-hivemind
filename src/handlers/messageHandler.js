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

        // Fetch recent messages for context
        let history = await discordManager.fetchMessages(message.channel.id, 20); // Example: fetch last 20 messages

        // Ensure the current message is not included in the history
        history = history.filter(m => m.id !== message.id);

        // Sort history in chronological order (oldest first)
        history.sort((a, b) => a.timestamp - b.timestamp);

        // Prepare history for the LLM including role assignment
        const preparedHistory = history.map(m => ({
            role: m.authorId === discordManager.botUserId ? 'assistant' : 'user',
            content: m.content
        }));

        // Construct the request body including the current message
        const llmRequestBody = llmManager.buildRequestBody([...preparedHistory, {
            role: 'user',
            content: message.content
        }]);

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
