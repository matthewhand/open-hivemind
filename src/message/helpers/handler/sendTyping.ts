import Debug from 'debug';
import type { Client} from 'discord.js';
import { TextChannel, NewsChannel } from 'discord.js';

const debug = Debug('app:sendTyping');

/**
 * Start Typing Indicator
 *
 * This function triggers the typing indicator in a specified Discord text or news channel.
 * It fetches the channel by its ID and starts the typing indicator if the channel supports it.
 *
 * Key Features:
 * - Fetches the channel by ID using the Discord client.
 * - Verifies if the channel supports typing indicators.
 * - Logs detailed information for debugging purposes.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel where the typing indicator should be started.
 * @returns {Promise<void>} A promise that resolves when the typing indicator is started.
 */
export async function sendTyping(client: Client, channelId: string): Promise<void> {
  try {
    debug('Fetching channel ID: ' + channelId);
    const channel = await client.channels.fetch(channelId);
    debug('Fetched channel: ' + (channel ? channel.id : 'null'));

    if (!channel) {
      debug('Channel with ID: ' + channelId + ' not found.');
      return;
    }

    debug('Channel type: ' + channel.type);
    if (channel instanceof TextChannel || channel instanceof NewsChannel) {
      await channel.sendTyping();
      debug('Started typing in channel ID: ' + channelId);
    } else {
      debug('Channel ID: ' + channelId + ' does not support typing.');
    }
  } catch (error: any) {
    debug('Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}
