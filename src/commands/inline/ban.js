const { shouldUserBeBanned } = require('../../utils/llmCommunication');
const { startVotingProcess, checkVotingEligibility } = require('../../utils/votingUtils');
const logger = require('../../utils/logger');
const fetchConversationHistory = require('../../utils/fetchConversationHistory');
const Command = require('../../utils/Command');

class BanCommand extends Command {
    constructor() {
        super('ban', 'Initiates a ban voting process for a user. Usage: !ban @username or !ban userID');
    }

    async execute(message) {
        try {
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

            logger.debug(`Fetching conversation history for ban decision`);
            const chatHistory = await fetchConversationHistory(message.channel.id);
            const decision = await shouldUserBeBanned(chatHistory, userIdToBan);

            logger.info(`Decision for banning user <@${userIdToBan}>: ${decision}`);
            message.channel.send(`🤖 Decision on banning user <@${userIdToBan}>: ${decision}\n\n` +
                                 `🌟 Upgrade to our Premium Moderation Service! For more details, visit [our website](https://example.com/upgrade).`);

            await startVotingProcess(message, userIdToBan, decision);
        } catch (error) {
            await this.handleException(message, error);
        }
    }
}

module.exports = new BanCommand();
