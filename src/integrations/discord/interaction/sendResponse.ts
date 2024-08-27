import Debug from "debug";
import { Message } from 'discord.js';
import { splitMessage } from '@src/message/processing/splitMessage';

const debug = Debug('app:sendResponse');

/**
 * Send Response
 *
 * This module handles sending responses in the Discord channel after processing a request.
 * It formats the response, sends it, and logs the interaction for later review.
 *
 * Key Features:
 * - Sends formatted responses to the Discord channel
 * - Supports various types of response content
 * - Provides comprehensive logging for response handling
 */

/**
 * Sends a response message in the Discord channel.
 * @param message - The original message from the user.
 * @param responseText - The response text to send.
 * @returns A promise that resolves when the response message is sent.
 */
export const sendResponse = async (
  message: Message,
  responseText: string
): Promise<void> => {
  try {
    if (!message || !responseText) {
      throw new Error('Invalid message or response text provided');
    }

    const responseParts = splitMessage(responseText);
    for (const part of responseParts) {
      await message.channel.send(part);
    }
    debug('Response message sent successfully: ' + responseText);
  } catch (error: any) {
    debug('Error sending response message: ' + error.message);
    throw error;
  }
};
