const { checkMutingEligibility, startMutingProcess } = require('../utils/mutingUtils');
const logger = require('../utils/logger');

const data = {
    name: 'mute',
    description: 'Mutes a user for a specified duration. Usage: !mute <userID> [duration]'
};

async function execute(message) {
    const args = message.content.split(' ').slice(1);
    const userIdToMute = args[0];
    const muteDuration = args[1] || '1h'; // Default duration of 1 hour

    if (!userIdToMute) {
        message.reply('Usage: !mute <userID> [duration]\nInitiates a process to mute a user for a specified duration.');
        return;
    }

    if (!checkMutingEligibility(message.author.id)) {
        message.reply('You have already initiated a mute this year.');
        return;
    }

    try {
        logger.debug(`Attempting to mute user ${userIdToMute} for ${muteDuration}`);
        await startMutingProcess(message, userIdToMute, muteDuration);
        message.reply(`User <@${userIdToMute}> has been muted for ${muteDuration}.`);
    } catch (error) {
        logger.error(`Error in execute function of mute command: ${error.message}`);
        message.reply('An error occurred while processing the mute request.');
    }
}

module.exports = { data, execute };
