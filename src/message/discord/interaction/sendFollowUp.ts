import { IMessage } from '@src/message/interfaces/IMessage';
import { sendMessageToChannel } from './sendMessageToChannel';
import logger from '@src/utils/logger';

/**
 * Sends a follow-up message to the specified channel.
 * @param message - The original message that triggered the follow-up.
 * @param channelId - The ID of the channel to send the follow-up message to.
 * @param topic - The topic of the follow-up message.
 */
export async function sendFollowUp(message: IMessage, channelId: string, topic: string): Promise<void> {
    const followUpContent = `Continuing the discussion on: ${topic}`;
    logger.info(`Sending follow-up message to channel ID: ${channelId}. Topic: ${topic}`);
    await sendMessageToChannel(channelId, followUpContent);
}
