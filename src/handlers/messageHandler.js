// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const messageResponseManager = require('../managers/messageResponseManager'); 
const constants = require('../config/constants');

// Global flag to prevent concurrent responses
let isResponding = false;

async function messageHandler(originalMessage) {
    if (isResponding) {
        logger.debug("Currently processing a message. Skipping new messages until completed.");
        return;
    }
    isResponding = true;

    const startTime = Date.now();
    const minimumProcessingTime = 10000; // Minimum processing time in milliseconds (e.g., 10 seconds)

    logger.debug(`Processing message from author ID: ${originalMessage.getAuthorId()}`);

    const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage); // Adjusted usage

    if (!shouldReply) {
        logger.debug("Decision made not to respond to this message based on the response manager's decision.");
        isResponding = false;
        return;
    }

    logger.debug("Beginning response process.");

    const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
    const requestBody = new OpenAiManager().buildRequestBody(history);

    try {
        const responseContent = await new OpenAiManager().sendRequest(requestBody);
        const elapsedTime = Date.now() - startTime;
        const delay = Math.max(0, minimumProcessingTime - elapsedTime);

        logger.debug(`Delaying response for ${delay}ms to meet minimum processing time.`);
        
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
