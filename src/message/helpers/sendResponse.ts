import { IMessage } from '@src/message/types/IMessage';
import logger from '@src/utils/logger';
import DiscordManager from '@src/message/discord/DiscordManager';

export async function sendMessageToChannel(messageContent: string | Buffer, channelId: string, startTime: number): Promise<void> {
    try {
        await sendMessagePart(messageContent, channelId);
        const processingTime = Date.now() - startTime;
        logger.info('[sendMessageToChannel] Message processing complete. Total time: ' + processingTime + 'ms.');
    } catch (error: any) {
        logger.error('[sendMessageToChannel] Failed to send message to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message: ' + error.message);
    }
}

async function sendMessagePart(part: string | Buffer, channelId: string): Promise<void> {
    try {
        const content = typeof part === 'string' ? part : part.toString();
        await DiscordManager.getInstance().sendMessageToChannel(channelId, content);
        logger.info('[sendMessagePart] Sent message part to channel ' + channelId + '. Content length: ' + content.length + '.');
    } catch (error: any) {
        logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message part: ' + error.message);
    }
}
