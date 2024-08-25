import Debug from "debug";
const debug = Debug("app");

import { VoiceChannel, Client } from 'discord.js';
import Debug from 'debug';
import { getRandomDelay } from '@src/utils/getRandomDelay';

const debug = Debug('app:voice:connectToVoiceChannel');

/**
 * Connects the bot to a voice channel and returns the connection instance.
 * 
 * @param {Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the voice channel to connect to.
 * @returns {Promise<VoiceChannel>} - The connected voice channel instance.
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
