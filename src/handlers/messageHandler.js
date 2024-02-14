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

    const discordManager = DiscordManager.getInstance();
    const llmManager = getLmManager(); // Dynamically select the LLM manager

    try {
        logger.info('Generating dynamic response...');

        // Fetch recent messages if necessary for context (not shown here)
        // This can be adjusted based on whether your LLM interaction requires conversational context
        const history = await discordManager.fetchMessages(message.channel.id);

        // Transform Discord messages into a format suitable for the LLM request
        const prompt = transformDiscordMessagesToPrompt(message.content, history);

        // Send the request to the LLM
        const llmRequestBody = llmManager.buildRequestBody(prompt);
        const response = await llmManager.sendRequest(llmRequestBody);

        // Parse the response and send it back in Discord
        const replyText = response.choices?.[0]?.text ?? "I'm not sure how to respond to that.";
        await discordManager.sendResponse(message.channel.id, replyText);

    } catch (error) {
        logger.error(`Error processing message: ${error}`);
        await discordManager.sendResponse(message.channel.id, 'Sorry, I encountered an error.');
    }
}

// Helper function to transform Discord message content (and potentially history) into a prompt
function transformDiscordMessagesToPrompt(currentMessage, historyMessages) {
    // Implement logic to transform message and history into a single prompt string
    // This is a placeholder implementation. Adjust based on how you want to use message history.
    return currentMessage; // For simplicity, just returning the current message as the prompt
}

module.exports = { messageHandler };
