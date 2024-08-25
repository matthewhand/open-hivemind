import { Client, TextChannel, Message as DiscordJSMessage } from 'discord.js';
import logger from '@src/utils/logger';
import { fetchChannel } from './fetchChannel';
import DiscordMessageImpl from './DiscordMessageImpl';
import { IMessage } from '@message/interfaces/IMessage';

/**
 * Fetches a list of messages from a Discord channel.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch messages from.
 * @param limit - The maximum number of messages to fetch.
 * @returns A Promise that resolves to an array of IMessage objects.
 */
export async function fetchMessages(client: Client, channelId: string, limit: number = 50): Promise<IMessage[]> {
    try {
        const channel = await fetchChannel(client, channelId);

        if (!channel || !(channel instanceof TextChannel)) {
            throw new Error('Invalid channel or not a text channel');
        }

        const messages = await channel.messages.fetch({ limit });
        const fetchedMessages: IMessage[] = messages.map((msg: DiscordJSMessage) => new DiscordMessageImpl(msg));

        logger.debug('Fetched ' + fetchedMessages.length + ' messages from channel ' + channelId);

        return fetchedMessages;
    } catch (error) {
        logger.error('Failed to fetch messages from channel ' + channelId + ': ' + (error instanceof Error ? error.message : error));
        return [];
    }
}
