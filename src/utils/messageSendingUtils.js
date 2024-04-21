const DiscordManager = require('../managers/DiscordManager');
const logger = require('./logger');
const constants = require('../config/constants');

/**
 * Sends a formatted message to a specified channel. If the message exceeds Discord's maximum message length,
 * it will be split into smaller parts and sent sequentially with delays between each part to mimic typing speed.
 * 
 * @param {string} messageContent The complete content of the message to send.
 * @param {string} channelId The Discord channel ID where the message will be sent.
 * @param {number} startTime The timestamp marking the start of the message processing, used for performance tracking.
 */
async function sendResponse(messageContent, channelId, startTime) {
    try {
        const parts = splitMessageContent(messageContent, constants.MAX_MESSAGE_LENGTH);
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                // Wait between parts to simulate human typing speed
                await new Promise(resolve => setTimeout(resolve, constants.INTER_PART_DELAY));
            }
            await sendMessagePart(parts[i], channelId);
            logger.debug(`[sendResponse] Sent part ${i + 1} of ${parts.length} to channel ${channelId}.`);
        }

        const processingTime = Date.now() - startTime;
        logger.info(`[sendResponse] Message processing complete. Total time: ${processingTime}ms.`);
    } catch (error) {
        logger.error(`[sendResponse] Failed to send message to channel ${channelId}. Error: ${error.message}`, { error });
        throw new Error(`Failed to send message: ${error.message}`);
    }
}

/**
 * Splits a long message into smaller parts according to a specified maximum part length.
 * This function ensures that the split points occur at space characters to avoid breaking words.
 * 
 * @param {string} messageContent The message content to split.
 * @param {number} maxPartLength The maximum length of each message part, typically set to Discord's limit.
 * @returns {string[]} An array of message parts, each conforming to the maximum part length.
 */
function splitMessageContent(messageContent, maxPartLength) {
    const parts = [];
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

    logger.debug(`[splitMessageContent] Split message into ${parts.length} parts.`);
    return parts;
}

/**
 * Sends a single part of a split message to a specified channel.
 * This function handles the dispatch of individual message segments to the Discord channel.
 * 
 * @param {string} part The individual part of the message to send.
 * @param {string} channelId The ID of the Discord channel where the message is being sent.
 */
async function sendMessagePart(part, channelId) {
    try {
        await DiscordManager.getInstance().sendMessage(channelId, part);
        logger.debug(`[sendMessagePart] Sent message part to channel ${channelId}. Content length: ${part.length}.`);
    } catch (error) {
        logger.error(`[sendMessagePart] Failed to send message part to channel ${channelId}. Error: ${error.message}`, { error });
        throw new Error(`Failed to send message part: ${error.message}`);
    }
}

/**
 * Helper function to delay message sending simulating typing speed.
 * This can be used to wait a specified amount of time before sending each message part,
 * which helps in simulating a more human-like interaction.
 * 
 * @param {number} duration The time to wait in milliseconds.
 */
function delay(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

module.exports = {
    sendResponse,
    sendMessagePart,
    splitMessageContent,
    delay
};
