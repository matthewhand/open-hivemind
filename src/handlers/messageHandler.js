// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const { messageResponseManager } = require('../managers/messageResponseManager');
const constants = require('../config/constants');

// Global flag to prevent concurrent responses
let isResponding = false;

async function messageHandler(originalMessage) {
    if (isResponding) {
        logger.debug("Currently processing a message. Skipping new messages until completed.");
        return;
    }

    logger.debug(`Original message author ID: ${originalMessage.getAuthorId()}`);
    // Implement other validation checks as needed

    const responseManager = new messageResponseManager();
    const decisionData = responseManager.shouldReplyToMessage(constants.CLIENT_ID, originalMessage);

    if (!decisionData.shouldReply) {
        logger.debug("Decision made not to respond to this message.");
        return;
    }

    // Simulate processing delay based on decision logic
    simulateProcessingDelay(decisionData.responseChance, async () => {
        const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
        const requestBody = new OpenAiManager().buildRequestBody(history);

        try {
            const responseContent = await new OpenAiManager().sendRequest(requestBody);
            // Ensure responseContent is structured as expected
            const messageToSend = responseContent.choices[0].message.content;
            await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), messageToSend);
            logger.info(`Response sent for message in channel ${originalMessage.getChannelId()}: "${messageToSend}"`);
        } catch (error) {
            logger.error(`Failed to process message: ${error}`, { errorDetail: error });
        } finally {
            isResponding = false; // Reset the flag once the response is completed
        }
    }, decisionData.responseChance);
}

/**
 * Simulates processing delay before sending a response.
 * @param {number} responseChance - Chance of replying, where 1 indicates a direct mention or reply.
 * @param {Function} callback - The callback to execute after the delay.
 */
function simulateProcessingDelay(responseChance, callback) {
    const baseDelayMs = 10000; // Base delay of 10 seconds
    let additionalDelayMs = 0;

    if (responseChance < 1) {
        // For lower chances of replying, add additional delay
        additionalDelayMs = 5000; // Additional 5 seconds
    }

    const totalDelayMs = baseDelayMs + additionalDelayMs;
    logger.debug(`Processing delay set for ${totalDelayMs / 1000} seconds.`);
    isResponding = true; // Set the flag to prevent new responses until this one completes

    setTimeout(callback, totalDelayMs);
}

module.exports = { messageHandler };
