import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';
import { DiscordService } from '@src/integrations/discord/DiscordService';

const log = Debug('app:sendMessageToChannel');

/**
 * Sends a message to the specified channel.
 *
 * @param channelId - The ID of the channel to send the message to
 * @param message - The content of the message
 */
export async function sendMessageToChannel(channelId: string, message: string): Promise<void> {
    try {
        const client = DiscordService.getInstance().getClientId();
        const channel = client.channels.cache.get(channelId) as TextChannel;
        if (!channel) {
            throw new Error('Channel not found');
        }
        log(`Sending message to channel ${channelId}: ${message}`);
        await channel.send(message);
        log(`Message sent to channel ${channelId} successfully`);
    } catch (error) {
        log(`Failed to send message to channel ${channelId}: ` + (error as Error).message);
        log((error as Error).stack);
        throw error;
    }
}
