const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('./logger');

async function fetchConversationHistory(channel, limit = 50) {
    try {
        const messages = await channel.messages.fetch({ limit: limit });
        return messages.map(message => ({
            content: message.content,
            username: message.author.username,
            // Capture additional fields as needed
            timestamp: message.createdTimestamp,
            userId: message.author.id,
            // ... any other relevant fields ...
        })).reverse();
    } catch (error) {
        logger.error('Error fetching conversation history:', error);
        return [];
    }
}

module.exports = fetchConversationHistory;
