import Debug from "debug";
import { Client, Message, TextChannel } from 'discord.js';
import { NetworkError } from '@src/types/errorClasses';

const debug = Debug('app:sendMessageToChannel');

/**
 * Sends a message to a specific Discord channel.
 * 
 * This function retrieves the channel by its ID, sends the specified message content to the channel, and logs the process.
 * It includes error handling to log and manage any issues that occur during message sending.
 * 
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param messageContent - The content of the message to be sent.
 * @returns {Promise<Message | void>} The sent message object or void if an error occurs.
 */
export async function sendMessageToChannel(client: Client, channelId: string, messageContent: string): Promise<Message | void> {
    const channel = client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
        debug('Channel with ID ' + channelId + ' not found.');
        return;
    }
    try {
        const sentMessage = await channel.send(messageContent);
        debug('Message sent to channel ID ' + channelId + ': ' + messageContent);
        return sentMessage;
    } catch (error: unknown) {
        const networkError = new NetworkError(
            `Failed to send message to channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
            undefined,
            undefined,
            { originalError: error }
        );

        debug('Network error sending message to channel ID ' + channelId + ': ' + networkError.message);
        console.error('Discord send message to channel network error:', networkError);
        // Note: This function previously didn't throw on error, just logged it
        // Maintaining that behavior for backward compatibility
    }
}
