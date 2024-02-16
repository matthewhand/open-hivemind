// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager'); 

// Global flag to prevent concurrent responses, ensuring one message is processed at a time.
let isResponding = false;

/**
 * Handles incoming Discord messages, deciding whether to reply based on predetermined criteria.
 * @param {DiscordMessage} originalMessage - The DiscordMessage object representing the message to process.
 */
async function messageHandler(originalMessage) {
    // Prevent handling new messages if the system is currently processing another message.
    if (isResponding) {
        logger.debug("Currently processing a message. Skipping new messages until completed.");
        return;
    }
    isResponding = true;

    // Record the start time to ensure a minimum processing time.
    const startTime = Date.now();
    const minimumProcessingTime = 10000; // 10 seconds minimum to simulate longer processing if needed.

    logger.debug(`Processing message from author ID: ${originalMessage.getAuthorId()}`);

    // Check if the message meets the criteria for a response.
    const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage);

    if (!shouldReply.shouldReply) {
        logger.debug("Decision made not to respond to this message based on the response manager's decision.");
        isResponding = false;
        return;
    }

    logger.debug("Beginning response process.");

    // Fetch the message history to provide context for the AI response.
    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    const requestBody = new OpenAiManager().buildRequestBody(history);

    try {
        // Send the request to OpenAI's API and wait for the response.
        const responseContent = await new OpenAiManager().sendRequest(requestBody);

        // Calculate the elapsed time and determine if a delay is needed to meet the minimum processing time.
        const elapsedTime = Date.now() - startTime;
        const delay = Math.max(0, minimumProcessingTime - elapsedTime);

        logger.debug(`Delaying response for ${delay}ms to meet minimum processing time.`);
        
        // Use setTimeout to delay the response if needed.
        setTimeout(async () => {
            const messageToSend = responseContent.choices[0].message.content;
            await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), messageToSend);
            logger.info(`Response sent for message in channel ${originalMessage.getChannelId()}: "${messageToSend}"`);
            isResponding = false;
        }, delay);
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
        isResponding = false;
    }
}

module.exports = { messageHandler };
