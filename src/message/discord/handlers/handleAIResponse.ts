// Import necessary modules
import { Message } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:handleAIResponse');

/**
 * Handle AI Response
 *
 * This module processes the AI response and sends it back to the Discord channel.
 * It manages the formatting, logging, and sending of the AI-generated content.
 *
 * Key Features:
 * - Processes AI responses
 * - Formats and sends messages to the Discord channel
 * - Logs response handling for debugging and monitoring
 */

/**
 * Handles the AI-generated response and sends it to the Discord channel.
 * @param message - The original message from the user.
 * @param response - The AI-generated response to send back.
 * @returns A promise that resolves when the message is sent.
 */
export const handleAIResponse = async (
  message: Message,
  response: string
): Promise<void> => {
  try {
    if (!message || !response) {
      throw new Error('Invalid message or response provided');
    }
    debug('Sending AI response to channel:', message.channel.id);
    await message.channel.send(response);
    debug('AI response sent successfully');
  } catch (error: any) {
    debug('Error handling AI response: ' + error.message);
    throw error;
  }
};
