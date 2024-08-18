import { Client, Channel } from 'discord.js';
import logger from '@utils/logger';

/**
 * Fetches a Discord channel by its ID.
 * This function abstracts the API call to fetch a channel, providing a simplified
 * interface for other utilities to access channel details. It ensures that errors
 * are handled gracefully and logs meaningful information for debugging.
 * 
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel to be fetched.
 * @returns {Promise<Channel | null>} The fetched channel object or null if an error occurs.
 */
export async function fetchChannel(client: Client, channelId: string): Promise<Channel | null> {
    if (!client) {
        logger.error('fetchChannel was called with an undefined or null client.');
        return null;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error('Failed to fetch channel with ID: ' + channelId + '. Channel does not exist or cannot be accessed.');
            return null;
        }
        logger.debug('Channel with ID: ' + channelId + ' fetched successfully.');
        return channel;
    } catch (error: any) {
        logger.error('Error fetching channel with ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
        return null;
    }
}
