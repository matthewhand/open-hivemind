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

// Adds a message response to the response queue for the specified channel.
// If the queue was empty, it also sets a timer to send out the batched responses
// after a specified delay.
function addToResponseQueue(messageResponse, channel) {
    // Only add non-empty responses to the queue
    if (messageResponse) {
        responseQueue.push(messageResponse);
    }

    // If there is no timer set (responseTimer is null), set a timer.
    // The timer delays the sending of messages, which allows batching
    // multiple responses together if they are generated in quick succession.
    if (!responseTimer) {
        // Set a timer for 30 seconds. After 30 seconds, sendBatchedResponses 
        // will be called to send all messages in the queue as a single batch.
        responseTimer = setTimeout(() => sendBatchedResponses(channel), 30000); // 30 seconds delay
    }
}
function sendBatchedResponses(channel) {
    let batchedResponse = responseQueue.join('\n');
    sendInChunks(channel, batchedResponse);
    responseQueue.length = 0;
    clearTimeout(responseTimer);
    responseTimer = null;
}

function sendInChunks(channel, text) {
    let start = 0;
    while (start < text.length) {
        let end = start + maxMessageLength - continuationString.length;
        const chunk = text.substring(start, end);
        channel.send(chunk + (end < text.length ? continuationString : ''));
        start = end;
    }
}

// Handles incoming messages and decides on follow-up actions
async function messageHandler(message) {
    if (message.author.bot) {
        logger.debug('Ignoring bot message');
        return;
    }

    logger.debug(`Received message: ${message.content}`);
    const guildId = message.guild.id;
    const handlerAlias = config.guildHandlers && config.guildHandlers[guildId] ? config.guildHandlers[guildId] : 'oai';

    try {
        const modifiedMessageContent = `!${handlerAlias} ${message.content}`;
        logger.debug(`Delegating to commandHandler with modifiedMessageContent: ${modifiedMessageContent}`);
        const response = await commandHandler(message, modifiedMessageContent);
        addToResponseQueue(response, message.channel);

        // Schedule a follow-up request with a random delay
        const delay = getRandomDelay(config.FOLLOW_UP_MIN_DELAY, config.FOLLOW_UP_MAX_DELAY);
        setTimeout(async () => {
            if (await shouldSendFollowUp(message, 5)) {
                scheduleFollowUpRequest(message);
                logger.info(`Follow-up request scheduled for message: ${message.id}`);
            } else {
                logger.info(`No follow-up required for message: ${message.id}`);
            }
        }, delay);

        logger.info(`Handled message: ${message.id}`);
    } catch (error) {
        logger.error(`Error in messageHandler for message: ${message.id}, Error: ${error}`);
    }
}

module.exports = { messageHandler };
