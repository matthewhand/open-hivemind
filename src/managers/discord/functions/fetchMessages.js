const logger = require('../../utils/logger');
const DiscordMessage = require('../../models/DiscordMessage');

/**
 * Fetches messages from a specified Discord channel.
 * @param {Discord.Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel from which messages are fetched.
 * @param {number} limit - The maximum number of messages to fetch.
 * @returns {Promise<DiscordMessage[]>} An array of messages in a generic format.
 */
async function fetchMessages(client, channelId, limit = 20) {
    if (!client) {
        logger.error('fetchMessages was called with an undefined or null client.');
        return [];
    }

    if (!client.channels) {
        logger.error('fetchMessages was called on a client with an undefined or null channels collection.');
        return [];
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error('Channel with ID  could not be fetched or does not exist.');
            return [];
        }

        const fetchedMessages = await channel.messages.fetch({ limit });
        return fetchedMessages.map(message => new DiscordMessage(message));
    } catch (error) {
        logger.error('Error fetching messages from Discord for channel ID :', error);
        return [];
    }
}

module.exports = fetchMessages;
