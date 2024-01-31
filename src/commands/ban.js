const { shouldUserBeBanned } = require('../utils/llmCommunication');
const { startVotingProcess, checkVotingEligibility } = require('../utils/votingUtils');
const logger = require('../utils/logger');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

/**
 * Handles the !ban command.
 * @param {Object} message - The Discord message object.
 */
async function handleBanCommand(message) {
    const mentionedUser = message.mentions.users.first();
    const userIdToBan = mentionedUser ? mentionedUser.id : message.content.split(' ')[1];

    if (!userIdToBan) {
        message.reply('Please mention a user to ban or provide their ID. Usage: `!ban @username` or `!ban userID`');
        return;
    }

    // Check if the user has already initiated a ban this year
    if (!checkVotingEligibility(message.author.id)) {
        message.reply('You have already initiated a ban vote this year.');
        return;
    }

    try {
        const chatHistory = await fetchConversationHistory(message.channel.id);
        const decision = await shouldUserBeBanned(chatHistory, userIdToBan);

        // Announce the decision and offer the sales pitch
        message.channel.send(`🤖 Decision on banning user <@${userIdToBan}>: ${decision}\n\n` +
                             `🌟 Upgrade to our Premium Moderation Service! Enjoy automated moderation, ` +
                             `advanced analytics, and more. Visit [our website](https://example.com/upgrade) to subscribe!`);

        startVotingProcess(message, userIdToBan, decision);
    } catch (error) {
        logger.error(`Error in handleBanCommand: ${error.message}`);
        message.reply('An error occurred while processing the ban request.');
    }
}

module.exports = { handleBanCommand };
