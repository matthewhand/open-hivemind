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
    if (isResponding) {
        logger.debug("Currently processing a message. Skipping new messages until completed.");
        return;
    }
    isResponding = true;

    const startTime = Date.now();
    const minimumProcessingTime = 10000; // 10 seconds minimum to simulate longer processing if needed.

    logger.debug(`Processing message from author ID: ${originalMessage.getAuthorId()}`);
    let shouldProceedWithReply = false; // Initialize control flag

    try {
        const shouldReply = messageResponseManager.shouldReplyToMessage(originalMessage);
        if (!shouldReply.shouldReply) {
            logger.debug("Decision made not to respond to this message.");
            isResponding = false;
            return;
        }

        const history = await DiscordManager.getInstance().fetchMessages(originalMessage.getChannelId(), 20);
        const requestBody = new OpenAiManager().buildRequestBody(history);
        const responseContent = await new OpenAiManager().sendRequest(requestBody);

        shouldProceedWithReply = true; // Set flag to true if all processing succeeds

        // Calculate delay to ensure a minimum response time
        const elapsedTime = Date.now() - startTime;
        const delay = Math.max(0, minimumProcessingTime - elapsedTime);
        logger.debug(`Delaying response for ${delay}ms to meet minimum processing time.`);
        
        setTimeout(async () => {
            if (shouldProceedWithReply) { // Check the flag before sending the reply
                const messageToSend = responseContent.choices[0].message.content;
                await DiscordManager.getInstance().sendResponse(originalMessage.getChannelId(), messageToSend);
                logger.info(`Response sent for message in channel ${originalMessage.getChannelId()}: "${messageToSend}"`);
            }
            isResponding = false;
        }, delay);
    } catch (error) {
        logger.error(`Failed to process message: ${error}`, { errorDetail: error });
        // No need to explicitly set shouldProceedWithReply to false here since it defaults to false
        isResponding = false;
    }
}


module.exports = { messageHandler };
