// Import necessary modules
import { Message } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:sendFollowUp');

/**
 * Send Follow-Up Message
 *
 * This module handles sending follow-up messages in response to an initial interaction.
 * It ensures the follow-up message is sent correctly and logs the action for debugging purposes.
 *
 * Key Features:
 * - Sends follow-up messages after an initial interaction
 * - Handles message formatting and sending
 * - Provides detailed logging for troubleshooting
 */

/**
 * Sends a follow-up message in the Discord channel.
 * @param message - The original message from the user.
 * @param followUpText - The follow-up text to send.
 * @returns A promise that resolves when the follow-up message is sent.
 */
export const sendFollowUp = async (
  message: Message,
  followUpText: string
): Promise<void> => {
  try {
    if (!message || !followUpText) {
      throw new Error('Invalid message or follow-up text provided');
    }
    debug('Sending follow-up message to channel:', message.channel.id);
    await message.channel.send(followUpText);
    debug('Follow-up message sent successfully');
  } catch (error: any) {
    debug('Error sending follow-up message: ' + error.message);
    throw error;
  }
};
