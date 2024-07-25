const logger = require('../../utils/logger');
const splitMessage = require('./splitMessage');

/**
 * Sends a response message to a specified Discord channel,
 * automatically handling messages that exceed Discord's character limit.
 * @param {Discord.Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel where the message will be sent.
 * @param {string} messageText - The content of the message to be sent.
 */
async function sendResponse(client, channelId, messageText) {
    if (!messageText) {
        logger.error('sendResponse was called with an undefined or null messageText.');
        return;
    }

    if (!channelId) {
        logger.error('sendResponse was called with an undefined or null channelId.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error('Failed to fetch channel with ID: ' + channelId);
            return;
        }

        const messageParts = splitMessage(messageText);

        for (const part of messageParts) {
            await channel.send(part);
            logger.debug('Message sent to channel ID: ' + channelId);
        }
    } catch (error) {
        logger.error('Error sending message to channel ID ' + channelId + ':', error);
    }
}

module.exports = sendResponse;
