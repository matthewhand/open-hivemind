// handleMuteCommand.js
const { checkMutingEligibility, startMutingProcess } = require('../utils/mutingUtils');
const logger = require('../utils/logger');

/**
 * Handles the !mute command.
 * @param {Object} message - The Discord message object.
 */
async function handleMuteCommand(message) {
    const args = message.content.split(' ').slice(1);
    const userIdToMute = args[0];
    const muteDuration = args[1] || '1h'; // Default duration 1 hour

    if (!userIdToMute) {
        message.reply('Usage: !mute <userID> [duration]\nInitiates a process to mute a user for a specified duration.');
        return;
    }

    if (!checkMutingEligibility(message.author.id)) {
        message.reply('You have already initiated a mute this year.');
        return;
    }

    try {
        // Implement logic for muting (e.g., adding to a muted role, scheduling unmute, etc.)
        startMutingProcess(message, userIdToMute, muteDuration);
    } catch (error) {
        logger.error(`Error in handleMuteCommand: ${error.message}`);
        message.reply('An error occurred while processing the mute request.');
    }
}

module.exports = { handleMuteCommand };
