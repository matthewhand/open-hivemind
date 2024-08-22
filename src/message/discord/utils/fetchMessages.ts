import { Client, Message as DiscordMessage, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import { DiscordMessageModel } from '../types/DiscordMessage';

/**
 * Fetches messages from a specified Discord channel.
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel from which messages are fetched.
 * @param {number} limit - The maximum number of messages to fetch.
 * @returns {Promise<DiscordMessageModel[]>} An array of messages in a generic format.
 */
export async function fetchMessages(client: Client, channelId: string, limit = 20): Promise<DiscordMessageModel[]> {
    if (!client) {
        logger.error('fetchMessages was called with an undefined or null client.');
        return [];
    }

    if (!client.channels) {
        logger.error('fetchMessages was called on a client with an undefined or null channels collection.');
        return [];
    }

    try {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        if (!channel) {
            logger.error('Channel with ID ' + channelId + ' could not be fetched or does not exist.');
            return [];
        }

        const fetchedMessages = await channel.messages.fetch({ limit });
        return fetchedMessages.map(message => new DiscordMessageModel(message));
    } catch (error: any) {
        logger.error('Error fetching messages from Discord for channel ID ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
        return [];
    }
}
