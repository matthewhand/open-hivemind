import Debug from "debug";
import { Message } from 'discord.js';
import { TextChannel, DMChannel } from "discord.js";
import { splitMessage } from '@src/message/helpers/processing/splitMessage';
import { HivemindError, ErrorUtils } from '@src/types/errors';

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
      throw ErrorUtils.createError(
        'Invalid message or response text provided',
        'ValidationError',
        'DISCORD_INVALID_RESPONSE_PARAMS',
        400,
        { hasMessage: !!message, hasResponseText: !!responseText }
      );
    }

    const responseParts = splitMessage(responseText);
    for (const part of responseParts) {
if (!(message.channel instanceof TextChannel || message.channel instanceof DMChannel)) { throw new Error("Unsupported channel type for send method."); }
      await message.channel.send(part);
    }
    debug('Response message sent successfully: ' + responseText);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error sending response message: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
        console.error('Discord send response error:', hivemindError);
    }

    throw ErrorUtils.createError(
        `Failed to send response: ${ErrorUtils.getMessage(hivemindError)}`,
        classification.type,
        'DISCORD_SEND_RESPONSE_ERROR',
        ErrorUtils.getStatusCode(hivemindError),
        { originalError: error }
    );
  }
};
