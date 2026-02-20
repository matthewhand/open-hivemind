import Debug from 'debug';
import type { TextChannel } from 'discord.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';

const debug = Debug('app:sendMessageToChannel');

/**
 * Send Message to Channel
 *
 * This function handles sending a message to a specified Discord text channel. It manages the sending process, handles any
 * errors that may occur, and logs the actions for easier debugging.
 *
 * Key Features:
 * - Sends a message to the specified Discord text channel.
 * - Handles potential errors during the message sending process.
 * - Logs the success or failure of the message sending operation.
 *
 * @param {TextChannel} channel - The channel to send the message to.
 * @param {string} content - The content of the message to send.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
export async function sendMessageToChannel(channel: TextChannel, content: string): Promise<void> {
  try {
    await channel.send(content);
    debug('Message sent to channel ' + channel.id);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error sending message to channel: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord send message to channel error:', hivemindError);
    }
  }
}
