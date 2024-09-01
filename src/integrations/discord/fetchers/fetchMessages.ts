import { TextChannel } from 'discord.js';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';

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
    return messages.map(msg => new DiscordMessage(msg));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}
