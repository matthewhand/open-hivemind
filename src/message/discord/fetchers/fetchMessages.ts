import Debug from "debug";
// Import necessary modules
import { Client, TextChannel } from 'discord.js';
/**
 * Fetch Messages from a Discord Channel
 *
 * This module is responsible for fetching messages from a specific Discord channel.
 * It retrieves the messages, handles any necessary filtering, and logs relevant information.
 *
 * Key Features:
 * - Fetch messages from a specified Discord channel
 * - Supports filtering messages based on criteria
 * - Provides detailed logging for debugging and audit purposes
 */

/**
 * Fetches messages from a Discord channel.
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch messages from.
 * @param limit - The number of messages to fetch.
 * @returns An array of fetched messages.
 */
export const fetchMessages = async (
  client: Client,
  channelId: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Channel not found');
    }
    debug(`Fetching up to ${limit} messages from channel ID: ${channelId}`);
    const messages = await channel.messages.fetch({ limit });
    debug(`Fetched ${messages.size} messages from channel ID: ${channelId}`);
    return Array.from(messages.values());
  } catch (error: any) {
    debug('Error fetching messages: ' + error.message);
    throw error;
  }
};
