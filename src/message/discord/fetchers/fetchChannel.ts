import Debug from "debug";
const debug = Debug("app");

import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';
const debug = Debug('app:discord:fetchChannel');
/**
 * Fetches a text channel by its ID.
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel to fetch.
 * @returns {Promise<TextChannel | null>} The fetched text channel or null if not found.
 */
export async function fetchChannel(
  client: Client,
  channelId: string
): Promise<TextChannel | null> {
  try {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Channel not found for ID ' + channelId);
    }
    return channel;
  } catch (error: any) {
    debug('Error fetching channel: ' + (error instanceof Error ? error.message : String(error)));
    return null;
  }
}
