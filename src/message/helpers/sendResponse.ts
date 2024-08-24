import { IMessage } from '@src/message/types/IMessage';
import logger from '@src/utils/logger';
import { sendFollowUp } from '@src/message/followUp/sendFollowUp';

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
        await DiscordManager.getInstance().sendMessageToChannel(channelId, part);
        logger.info('[sendMessagePart] Sent message part to channel ' + channelId + '. Content length: ' + part.length + '.');
    } catch (error: any) {
        logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message part: ' + error.message);
    }
}
