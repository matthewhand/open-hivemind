const logger = require('./logger');
const { config } = require('../utils/configUtils'); // Import config utilities

async function fetchConversationHistory(channel) {
    try {
        const limit = config.historyFetchLimit || 50; // Use configurable limit or default to 50
        const messages = await channel.messages.fetch({ limit });
        return messages.map(message => ({
            content: message.content,
            username: message.author.username,
            timestamp: message.createdTimestamp,
            userId: message.author.id,
            // ... other fields ...
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        return [];
    }
}

module.exports = fetchConversationHistory;
