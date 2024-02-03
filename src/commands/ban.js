const { shouldUserBeBanned } = require('../utils/llmCommunication');
const { startVotingProcess, checkVotingEligibility } = require('../utils/votingUtils');
const logger = require('../utils/logger');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

const data = {
    name: 'ban',
    description: 'Initiates a ban voting process for a user. Usage: !ban @username or !ban userID'
};

async function execute(message) {
    const mentionedUser = message.mentions.users.first();
    const userIdToBan = mentionedUser ? mentionedUser.id : message.content.split(' ')[1];

    if (!userIdToBan) {
        message.reply('Please mention a user to ban or provide their ID. Usage: `!ban @username` or `!ban userID`');
        return;
    }

    if (!checkVotingEligibility(message.author.id)) {
        message.reply('You have already initiated a ban vote this year.');
        return;
    }

    try {
        logger.debug(`Fetching conversation history for ban decision`);
        const chatHistory = await fetchConversationHistory(message.channel.id);
        const decision = await shouldUserBeBanned(chatHistory, userIdToBan);

        logger.info(`Decision for banning user <@${userIdToBan}>: ${decision}`);
        message.channel.send(`🤖 Decision on banning user <@${userIdToBan}>: ${decision}\n\n` +
                             `🌟 Upgrade to our Premium Moderation Service! For more details, visit [our website](https://example.com/upgrade).`);

        await startVotingProcess(message, userIdToBan, decision);
    } catch (error) {
        logger.error(`Error in execute function of ban command: ${error.message}`);
        message.reply('An error occurred while processing the ban request.');
    }
}

module.exports = { data, execute };
