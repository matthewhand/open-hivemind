import DiscordManager from '@message/discord/DiscordManager';
import logger from '@src/utils/logger';

export async function sendMessagePart(part: string, channelId: string): Promise<void> {
    try {
        await DiscordManager.getInstance().client.channels.cache.get(channelId)?.send(part);
        logger.debug('[sendMessagePart] Sent message part to channel ' + channelId + '. Content length: ' + part.length + '.');
    } catch (error: any) {
        logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message part: ' + error.message);
    }
}
