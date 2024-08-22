import logger from '@src/utils/logger';
import { splitMessageContent } from '../helpers/splitMessage';
import DiscordManager from '../managers/DiscordManager';
import constants from '../../config/ConfigurationManager';

/**
 * Sends a response message to a specified channel with artificial delays to simulate human-like interaction.
 * Ensures continuous sending of parts of a long message with a consistent small delay.
 * Introduces a larger delay if the channel had recent activity, simulating "reading" time.
 *
 * @param messageContent - The content of the message to be sent.
 * @param channelId - The Discord channel ID where the message will be sent.
 * @param startTime - The timestamp when the message processing started, used to calculate total processing time.
 */
export async function sendResponse(messageContent: string, channelId: string, startTime: number): Promise<void> {
    const maxPartLength = 2000; // Discord's max message length limit
    const randomSplit = Math.random() < 0.5; // 50% chance to split randomly
    logger.debug(`[sendResponse] Starting to send response to channel ${channelId}. Initial content length: ${messageContent.length}`);

    // Calculate initial delay based on the length of the message to simulate typing speed
    const typingSpeedPerChar = 1000; // milliseconds per character
    const initialDelay = Math.min(messageContent.length * typingSpeedPerChar, constants.BOT_TYPING_DELAY_MAX_MS);
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    let parts = [messageContent];

    // Decide whether to split the message
    if (messageContent.length > maxPartLength || randomSplit) {
        parts = splitMessageContent(messageContent, maxPartLength);
        logger.debug(`[sendResponse] Message split into ${parts.length} parts due to length exceeding ${maxPartLength} characters or random split condition.`);
    }

    for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, constants.INTER_PART_DELAY)); // Delay for each part after the first
        }
        await sendMessagePart(parts[i], channelId);
        logger.debug(`[sendResponse] Sent part ${i + 1} of ${parts.length}.`);
    }

    const processingTime = Date.now() - startTime;
    logger.info(`[sendResponse] Message processing complete. Total time: ${processingTime}ms.`);
}

/**
 * Sends a single part of a message to the specified channel.
 *
 * @param part - The part of the message to send.
 * @param channelId - The channel ID to send the message to.
 */
async function sendMessagePart(part: string, channelId: string): Promise<void> {
    logger.debug(`[sendMessagePart] Sending message part to channel ${channelId}. Content length: ${part.length}.`);
    await DiscordManager.getInstance().sendMessage(channelId, part);
    logger.debug(`[sendMessagePart] Message part sent to channel ${channelId}.`);
}

