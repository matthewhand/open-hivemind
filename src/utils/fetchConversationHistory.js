const { Client, GatewayIntentBits } = require('discord.js');

// Function to fetch conversation history
async function fetchConversationHistory(channel, limit = 50) {
    try {
        const messages = await channel.messages.fetch({ limit: limit });
        return messages.map(message => message.content).reverse();
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        return [];
    }
}

module.exports = fetchConversationHistory;
