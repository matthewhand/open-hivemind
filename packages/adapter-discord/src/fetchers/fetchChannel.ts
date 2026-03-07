import { TextChannel, type Client } from 'discord.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';

/**
 * Fetch Channel
 *
 * This function fetches a channel by its ID using the provided Discord client.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch.
 * @returns A promise that resolves to the channel object or null if not found.
 */
export async function fetchChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel instanceof TextChannel) {
      return channel;
    }
    return null;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord fetch channel error:', hivemindError);
    }

    return null;
  }
}
