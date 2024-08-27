import Debug from "debug";
import { VoiceChannel, Client } from 'discord.js';
import { getRandomDelay } from '@src/utils/getRandomDelay';

const debug = Debug('app:connectToVoiceChannel');

/**
 * Connect to Voice Channel
 *
 * This function handles the connection of the bot to a specified Discord voice channel. It includes logic to simulate a
 * connection delay and handles any errors that may occur during the connection process.
 *
 * Key Features:
 * - Fetches and validates the specified voice channel using the provided channel ID.
 * - Simulates a delay before establishing the connection to the voice channel.
 * - Logs key actions and errors for easier debugging and maintenance.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the voice channel to connect to.
 * @returns A promise that resolves to the connected voice channel instance.
 */
export async function connectToVoiceChannel(
  client: Client,
  channelId: string
): Promise<VoiceChannel> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof VoiceChannel)) {
      debug('Failed to fetch or invalid channel for ID: ' + channelId);
      throw new Error('Invalid voice channel ID');
    }
    debug('Connecting to voice channel: ' + channel.name);
    const delay = getRandomDelay(1000, 5000);
    debug('Simulating connection delay of ' + delay + 'ms');
    await new Promise(resolve => setTimeout(resolve, delay));
    return channel;
  } catch (error: any) {
    debug('Error connecting to voice channel: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}
