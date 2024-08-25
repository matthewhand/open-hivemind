import { Client, TextChannel, Message as DiscordJSMessage } from 'discord.js';
import Debug from 'debug';
import { fetchChannel } from './fetchChannel';
import DiscordMessage from '../DiscordMessage';
import { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:discord:fetchMessages');

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
        const fetchedMessages: IMessage[] = messages.map((msg: DiscordJSMessage) => new DiscordMessage(msg));

        debug('Fetched ' + fetchedMessages.length + ' messages from channel ' + channelId);

        return fetchedMessages;
    } catch (error) {
        debug('Failed to fetch messages from channel ' + channelId + ': ' + (error instanceof Error ? error.message : error));
        return [];
    }
}
