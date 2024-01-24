const { shouldUserBeBanned } = require('../utils/llmCommunication');
const { startVotingProcess, checkVotingEligibility } = require('../utils/votingUtils');
const logger = require('../utils/logger');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

/**
 * Handles the !ban command.
 * @param {Object} message - The Discord message object.
 */
async function handleBanCommand(message) {
    const args = message.content.split(' ').slice(1);
    const userIdToBan = args[0];

    if (!userIdToBan) {
        message.reply('Usage: !ban <userID>\nInitiates a voting process to decide if a user should be banned.');
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

        startVotingProcess(message, userIdToBan, decision);
    } catch (error) {
        logger.error(`Error in handleBanCommand: ${error.message}`);
        message.reply('An error occurred while processing the ban request.');
    }
}

module.exports = { handleBanCommand };
