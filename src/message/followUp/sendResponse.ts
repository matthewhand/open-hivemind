import DiscordManager from '@message/discord/DiscordManager';
import logger from '@utils/logger';
import ConfigurationManager from '@common/config/ConfigurationManager';

export async function sendResponse(messageContent: string | Buffer, channelId: string, startTime: number): Promise<void> {
    try {
        const isString = typeof messageContent === 'string';
        const isBuffer = Buffer.isBuffer(messageContent);

        if (!isString && !isBuffer) {
            throw new Error('Invalid messageContent type: ' + typeof messageContent);
        }

        const isChannelIdValid = typeof channelId === 'string' && channelId.trim() !== '';
        if (!isChannelIdValid) {
            throw new Error('No channelId provided or channelId is not a valid string.');
        }

        const maxMessageLength = ConfigurationManager.get<number>('messagePlatform.discord.maxMessageLength');
        const parts = splitMessageContent(messageContent, maxMessageLength);

        const interPartDelay = ConfigurationManager.get<number>('messagePlatform.discord.interPartDelayMs');
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                await delay(interPartDelay);
            }
            logger.debug('[sendResponse] Sending part ' + (i + 1) + ' to channel ' + channelId + '. Part content: ' + parts[i]);
            await sendMessagePart(parts[i], channelId);
            logger.debug('[sendResponse] Sent part ' + (i + 1) + ' of ' + parts.length + ' to channel ' + channelId + '.');
        }

        const processingTime = Date.now() - startTime;
        logger.info('[sendResponse] Message processing complete. Total time: ' + processingTime + 'ms.');
    } catch (error: any) {
        logger.error('[sendResponse] Failed to send message to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message: ' + error.message);
    }
}

function splitMessageContent(messageContent: string, maxPartLength: number): string[] {
    const parts: string[] = [];
    let currentPart = '';

    const words = messageContent.split(' ');
    for (let word of words) {
        if (currentPart.length + word.length + 1 > maxPartLength) {
            parts.push(currentPart);
            currentPart = word;
        } else {
            currentPart += (currentPart.length > 0 ? ' ' : '') + word;
        }
    }
    if (currentPart) {
        parts.push(currentPart);
    }

    logger.debug('[splitMessageContent] Split message into ' + parts.length + ' parts.');
    return parts;
}

async function sendMessagePart(part: string | Buffer, channelId: string): Promise<void> {
    try {
        const isPartString = typeof part === 'string';
        const isPartBuffer = Buffer.isBuffer(part);

        if (!isPartString && !isPartBuffer) {
            throw new Error('Invalid part type: ' + typeof part);
        }

        await DiscordManager.getInstance().sendMessage(channelId, part);
        logger.debug('[sendMessagePart] Sent message part to channel ' + channelId + '. Content length: ' + part.length + '.');
    } catch (error: any) {
        logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
        throw new Error('Failed to send message part: ' + error.message);
    }
}

function delay(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
}
