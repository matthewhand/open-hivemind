// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const { messageResponseManager } = require('../managers/messageResponseManager');
const constants = require('../config/constants');

let isResponding = false;

async function messageHandler(originalMessage) {
    if (isResponding) {
        logger.debug("Skipping new messages until the current processing is completed.");
        return;
    }

    isResponding = true;
    logger.debug(`Processing message from author ID: ${originalMessage.getAuthorId()}`);

    const responseManager = new messageResponseManager();
    const shouldRespond = responseManager.shouldReplyToMessage(originalMessage);

    if (!shouldRespond) {
        logger.debug("Chose not to respond to the message.");
        isResponding = false;
        return;
    }

    await simulateProcessingDelay(shouldRespond.responseChance);

    try {
        const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
        const requestBody = new OpenAiManager().buildRequestBody(history);
        const responseContent = await new OpenAiManager().sendRequest(requestBody);
        
        if (responseContent && responseContent.choices && responseContent.choices.length > 0) {
            const messageToSend = responseContent.choices[0].message.content;
            await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), messageToSend);
            logger.info(`Sent response for message in channel ${originalMessage.getChannelId()}.`);
        }
    } catch (error) {
        logger.error(`Error processing message: ${error}`, { errorDetail: error });
    } finally {
        isResponding = false;
    }
}

async function simulateProcessingDelay(responseChance) {
    const baseDelay = 10000; // Base delay in milliseconds
    let delay = baseDelay;

    if (responseChance < 1) {
        delay += 5000; // Additional delay for less certain responses
    }

    logger.debug(`Delaying response by ${delay / 1000} seconds.`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = { messageHandler };
