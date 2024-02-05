const axios = require('axios');
const { aliases } = require('../config/aliases');
const { commandHandler } = require('./commandHandler');
const { scheduleFollowUpRequest, shouldSendFollowUp } = require('../utils/followUpRequest');
const logger = require('../utils/logger');
const { config } = require('../utils/configUtils');
const { getRandomDelay } = require('../utils/common');

// Response batching logic
const responseQueue = [];
const maxMessageLength = 2000;
const continuationString = '...';
let responseTimer = null;

function addToResponseQueue(messageResponse) {
    if (messageResponse) {
        responseQueue.push(messageResponse);
    }

    if (!responseTimer) {
        responseTimer = setTimeout(sendBatchedResponses, 30000);
    }
}

function sendBatchedResponses() {
    let batchedResponse = responseQueue.join('\n');
    sendInChunks(batchedResponse);
    responseQueue.length = 0;
    clearTimeout(responseTimer);
    responseTimer = null;
}

function sendInChunks(text) {
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxMessageLength, text.length);
        const chunk = text.substring(start, end);
        // Send chunk to Discord channel
        // channel.send(chunk);
        start = end;
    }
}

async function messageHandler(message) {
    if (message.author.bot) {
        logger.debug('Ignoring bot message');
        return;
    }

    logger.debug(`Received message: ${message.content}`);
    
    try {
        // Directly use message content without modification
        const response = await commandHandler(message, message.content);
        if (response) {
            addToResponseQueue(response);
            logger.debug(`Added response to queue`);
        }

        // Follow-up request logic
        const delay = getRandomDelay(config.FOLLOW_UP_MIN_DELAY, config.FOLLOW_UP_MAX_DELAY);
        setTimeout(async () => {
            if (await shouldSendFollowUp(message, config.unsolicitedChannelCap)) {
                await scheduleFollowUpRequest(message);
                logger.info(`Scheduled follow-up request for message: ${message.id}`);
            } else {
                logger.info(`No follow-up required for message: ${message.id}`);
            }
        }, delay);

        logger.info(`Handled message: ${message.id}`);
    } catch (error) {
        logger.error(`Error in messageHandler for message: ${message.id}`, error);
    }
}

module.exports = { messageHandler };
