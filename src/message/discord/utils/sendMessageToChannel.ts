import Debug from "debug";
const debug = Debug("app");

import { TextChannel } from 'discord.js';
import Debug from 'debug';
const debug = Debug('app:discord:sendMessageToChannel');
/**
 * Sends a message to a specific Discord text channel.
 * @param {TextChannel} channel - The channel to send the message to.
 * @param {string} content - The content of the message to send.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
export async function sendMessageToChannel(
  channel: TextChannel,
  content: string
): Promise<void> {
  try {
    await channel.send(content);
    debug('Message sent to channel ' + channel.id);
  } catch (error: any) {
    debug('Error sending message to channel: ' + (error instanceof Error ? error.message : String(error)));
  }
}
