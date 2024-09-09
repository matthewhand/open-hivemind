import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';

const log = Debug('app:sendMessageToChannel');

/**
 * Sends a message to the specified channel.
 *
 * @param client - The Discord client instance
 * @param channelId - The ID of the channel to send the message to
 * @param message - The content of the message
 */
export async function sendMessageToChannel(client: Client, channelId: string, message: string): Promise<void> {
    try {
        const channel = client.channels.cache.get(channelId) as TextChannel;
        if (!channel) {
            throw new Error('Channel not found');
        }
        log(`Sending message to channel ${channelId}: ${message}`);
        await channel.send(message);
        log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
        log(`Failed to send message to channel ${channelId}: ` + error.message);
        log(error.stack);
        throw error;
    }
}
