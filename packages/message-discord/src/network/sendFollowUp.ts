import Debug from 'debug';
import { DMChannel, TextChannel, type Message } from 'discord.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';

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
export const sendFollowUp = async (message: Message, followUpText: string): Promise<void> => {
  try {
    if (!message || !followUpText) {
      throw ErrorUtils.createError(
        'Invalid message or follow-up text provided',
        'ValidationError' as any,
        'DISCORD_INVALID_FOLLOWUP_PARAMS',
        400,
        { hasMessage: !!message, hasFollowUpText: !!followUpText }
      );
    }
    debug('Sending follow-up message to channel: ' + message.channel.id);
    if (!(message.channel instanceof TextChannel || message.channel instanceof DMChannel)) {
      throw new Error('Unsupported channel type for send method.');
    }
    await message.channel.send(followUpText);
    debug('Follow-up message sent successfully');
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error sending follow-up message: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord send follow-up error:', hivemindError);
    }

    throw ErrorUtils.createError(
      `Failed to send follow-up: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'DISCORD_SEND_FOLLOWUP_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error }
    );
  }
};
