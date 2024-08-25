import { IMessage } from '@src/message/types/IMessage';
import logger from '@src/utils/logger';
import DiscordManager from '@src/message/discord/DiscordManager';

export async function sendMessagePart(messageContent: string | Buffer, channelId: string): Promise<void> {
    try {
        const discordManager = DiscordManager.getInstance();
        const content = typeof messageContent === 'string' ? messageContent : messageContent.toString();
        await discordManager.sendMessageToChannel(channelId, content);
        logger.info('Message part sent successfully.');
    } catch (error: any) {
        logger.error('Failed to send message part: ' + error.message);
        throw error;
    }
}
