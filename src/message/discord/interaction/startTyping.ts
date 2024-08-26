import Debug from 'debug';
import { Client, TextChannel, NewsChannel } from 'discord.js';

const debug = Debug('app:startTyping');

export async function startTyping(client: Client, channelId: string): Promise<void> {
    try {
        debug('Fetching channel ID: ' + channelId);
        const channel = await client.channels.fetch(channelId);
        debug('Fetched channel: ' + (channel ? channel.id : 'null'));

        if (!channel) {
            debug('Channel with ID: ' + channelId + ' not found.');
            return;
        }

        debug('Channel type: ' + channel.type);
        if (channel instanceof TextChannel || channel instanceof NewsChannel) {
            await channel.sendTyping();
            debug('Started typing in channel ID: ' + channelId);
        } else {
            debug('Channel ID: ' + channelId + ' does not support typing.');
        }
    } catch (error: any) {
        debug('Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
    }
}
