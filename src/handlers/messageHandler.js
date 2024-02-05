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

function addToResponseQueue(messageResponse, channel) {
    if (messageResponse) {
        responseQueue.push(messageResponse);
    }

    if (!responseTimer) {
        responseTimer = setTimeout(() => sendBatchedResponses(channel), 30000);
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

        // Debugging the response from commandHandler
        const response = await commandHandler(message, modifiedMessageContent);
        logger.debug(`Response from commandHandler: ${response}`);

        if (response) {
            addToResponseQueue(response, message.channel);
            logger.debug(`Added response to queue for channel: ${message.channel.id}`);
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
        logger.error(`Error in messageHandler for message: ${message.id}: ${error}`);
        logger.debug(`Error details: ${error.stack}`); // Debugging the error stack
    }
}

module.exports = { messageHandler };
