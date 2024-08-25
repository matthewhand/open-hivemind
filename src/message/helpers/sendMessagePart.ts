import { Client, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import { sendMessageToChannel } from '@src/message/discord/utils/sendMessageToChannel';

export async function sendMessagePart(client: Client, channelId: string, content: string): Promise<Message | void> {
    try {
        const channel = client.channels.cache.get(channelId) as TextChannel;
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found.`);
        }

        logger.info('Sending message part to channel ID: ' + channelId);
        const sentMessage = await sendMessageToChannel(client, channelId, content);
        return sentMessage;
    } catch (error: any) {
        logger.error('Failed to send message part:', error);
    }
}
