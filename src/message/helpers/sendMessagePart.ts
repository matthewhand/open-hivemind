import Debug from "debug";
const debug = Debug("app");

import { TextChannel } from 'discord.js';
import Debug from 'debug';
const debug = Debug('app:message:sendMessagePart');
/**
 * Sends a part of a message to a specified text channel.
 * @param {TextChannel} channel - The text channel to send the message to.
 * @param {string} content - The content of the message part to send.
 * @param {string} originalMessageId - The ID of the original message being followed up.
 * @returns {Promise<void>} A promise that resolves when the message part is sent.
 */
export async function sendMessagePart(
  channel: TextChannel,
  content: string,
  originalMessageId: string
): Promise<void> {
  try {
    const sentMessage = await channel.send(content);
    debug('Message part sent: ' + content + ' as reply to ' + originalMessageId);
  } catch (error: any) {
    debug('Error sending message part: ' + (error instanceof Error ? error.message : String(error)));
  }
}
