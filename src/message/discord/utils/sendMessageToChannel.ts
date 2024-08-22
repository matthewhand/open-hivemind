// src/message/discord/utils/sendMessageToChannel.ts

import { Client, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';

/**
 * Sends a message to a specified channel using the Discord client.
 * 
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param message - The message to send.
 * @returns A promise that resolves with the sent message.
 * @throws Will throw an error if the channel is not found or if sending the message fails.
 */
export async function sendMessageToChannel(client: Client, channelId: string, message: string): Promise<Message> {
    logger.info('Attempting to send a message to channel ID: ' + channelId + '.');

    // Guard clause: Ensure the channel exists.
    const channel = client.channels?.cache.get(channelId) as TextChannel;
    if (!channel) {
        const errorMessage = 'Channel with ID ' + channelId + ' not found.';
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }

    try {
        const sentMessage = await channel.send(message);
        logger.info('Message sent to channel ID: ' + channelId + '.');
        return sentMessage;
    } catch (error: any) {
        const errorMessage = 'Failed to send message to channel ID ' + channelId + ': ' + (error instanceof Error ? error.message : String(error));
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
}
