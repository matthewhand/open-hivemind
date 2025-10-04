import Debug from 'debug';
import { Message } from 'discord.js';
import { TextChannel, DMChannel } from "discord.js";
import { ValidationError, NetworkError } from '@src/types/errorClasses';

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
      throw new ValidationError(
        'Invalid message or response text provided',
        'DISCORD_INVALID_RESPONSE_PARAMS',
        { hasMessage: !!message, hasResponseText: !!responseText }
      );
    }
    debug('Sending response message to channel: ' + message.channel.id);
    if (!(message.channel instanceof TextChannel || message.channel instanceof DMChannel)) {
      throw new ValidationError("Unsupported channel type for send method.", 'DISCORD_UNSUPPORTED_CHANNEL_TYPE');
    }
    await message.channel.send(responseText);
    debug('Response message sent successfully');
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      debug('Validation error sending response message: ' + error.message);
      console.error('Discord send response validation error:', error);
      throw error;
    }

    const networkError = new NetworkError(
      `Failed to send response: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      undefined,
      { originalError: error }
    );

    debug('Network error sending response message: ' + networkError.message);
    console.error('Discord send response network error:', networkError);
    throw networkError;
  }
};
