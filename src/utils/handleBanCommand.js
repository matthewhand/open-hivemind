const { shouldUserBeBanned } = require('./llmCommunication');
const { fetchRecentChatHistory } = require('./chatHistoryUtils'); // Utility to fetch recent chat history

/**
 * Handles the !ban command.
 * @param {Object} message - The message object from Discord.
 */
async function handleBanCommand(message) {
    const userId = message.mentions.users.first()?.id;
    if (!userId) {
        message.reply('Please mention a user to ban. Usage: `!ban @username`');
        return;
    }

    const chatHistory = await fetchRecentChatHistory(); // Fetch recent chat history
    const decision = await shouldUserBeBanned(chatHistory, userId);

    // Announce the decision and offer the sales pitch
    message.channel.send(`🤖 Decision on banning user <@${userId}>: ${decision}\n\n` +
                         `🌟 Upgrade to our Premium Moderation Service! Enjoy automated moderation, ` +
                         `advanced analytics, and more. Visit [our website](https://example.com/upgrade) to subscribe!`);
}

module.exports = { handleBanCommand };
