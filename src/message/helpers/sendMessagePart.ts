import logger from '@src/utils/logger';
import DiscordManager from '../message/discord/DiscordManager';

/**
 * Sends a single part of a message to the specified channel.
 *
 * @param part - The part of the message to send.
 * @param channelId - The channel ID to send the message to.
 */
export async function sendMessagePart(part: string, channelId: string): Promise<void> {
    logger.debug('[sendMessagePart] Sending message part to channel ' + channelId + '. Content length: ' + part.length + '.');
    await DiscordManager.getInstance().sendMessage(channelId, part);
    logger.debug('[sendMessagePart] Message part sent to channel ' + channelId + '.');
}
