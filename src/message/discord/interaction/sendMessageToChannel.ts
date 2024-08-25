import { TextChannel } from 'discord.js';
import { Client, Message } from 'discord.js';
import logger from '@src/utils/logger';

/**
 * Sends a message to a specified channel by ID.
 * 
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel where the message will be sent.
 * @param message - The content of the message to send.
 * @returns A promise that resolves to the sent Message object.
 */
export async function sendMessageToChannel(client: Client, channelId: string, message: string): Promise<Message> {
    logger.info(`DiscordManager: Sending a message to channel ID: ${channelId}. Message: ${message}`);
    return await (client.channels.cache.get(channelId) as TextChannel)?.send(message);
}
