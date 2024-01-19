const { Client, GatewayIntentBits } = require('discord.js');

async function fetchConversationHistory(channel, limit = 50) {
    try {
        const messages = await channel.messages.fetch({ limit: limit });
        return messages.map(message => ({
            content: message.content,
            username: message.author.username
        })).reverse();
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        return [];
    }
}

module.exports = fetchConversationHistory;
