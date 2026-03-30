import type { TextChannel } from 'discord.js';
import type { IMessage } from '@src/message/interfaces/IMessage';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import DiscordMessage from '../DiscordMessage';

/**
 * Fetch Messages
 *
 * This function fetches the last 50 messages from a specified channel.
 *
 * @param channel - The TextChannel to fetch messages from.
 * @returns A promise that resolves to an array of IMessage objects.
 */
export async function fetchMessages(channel: TextChannel): Promise<IMessage[]> {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    return messages.map((msg) => new DiscordMessage(msg));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord fetch messages error:', hivemindError);
    }

    return [];
  }
}
