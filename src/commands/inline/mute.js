const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { checkMutingEligibility, muteMember, parseDuration } = require('../../utils/mutingUtils');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class MuteCommand extends Command {
    constructor() {
        super('mute', 'Mutes a user for a specified duration. Usage: !mute <userID> [duration]');
    }

    async execute(message) {
        try {
            const args = message.content.split(' ').slice(1);
            const userIdToMute = args[0];
            const muteDuration = args[1] || '1h'; // Default duration of 1 hour

            if (!userIdToMute) {
                message.reply('Usage: !mute <userID> [duration]\nInitiates a process to mute a user for a specified duration.');
                return;
            }

            if (!checkMutingEligibility(message.author.id)) {
                message.reply('You are not eligible to initiate a mute.');
                return;
            }

            const memberToMute = message.guild.members.cache.get(userIdToMute);
            if (!memberToMute) {
                message.reply('User not found.');
                return;
            }

            const durationMs = parseDuration(muteDuration);
            await muteMember(memberToMute, durationMs, `Muted by ${message.author.tag}`);
            message.reply(`User <@${userIdToMute}> has been muted for ${muteDuration}.`);
        } catch (error) {
            logger.error(`Error in MuteCommand execute:`, error);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new MuteCommand();
