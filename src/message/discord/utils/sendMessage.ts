import { sendResponse } from './sendResponse';
import logger from '@src/utils/logger';

/**
 * Sends a message to a specified channel.
 * @param {string} channelId - The ID of the channel to send the message to.
 * @param {string} messageText - The text of the message to be sent.
 * @returns {Promise<void>}
 */
export async function sendMessage(channelId: string, messageText: string): Promise<void> {
    logger.info('Sending message to channel ID: ' + channelId + '. Message: ' + messageText);
    await sendResponse(channelId, messageText);
}
