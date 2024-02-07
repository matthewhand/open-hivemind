const axios = require('axios');
const { aliases } = require('../config/aliases');
const { commandHandler } = require('./commandHandler');
const { scheduleFollowUpRequest, shouldSendFollowUp } = require('../utils/followUpRequest');
const logger = require('../utils/logger');
const { config } = require('../utils/configUtils');
const { getRandomDelay } = require('../utils/common');

async function messageHandler(message) {
    if (message.author.bot) {
        logger.debug('Ignoring bot message');
        return;
    }

    logger.info(`Received message: ${message.content}`);

    try {
        // Call commandHandler to directly handle the command execution and response
        // This assumes commandHandler itself takes care of sending responses back to the Discord channel
        await commandHandler(message, message.content);

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
        // Ensure to provide feedback to the user that an error occurred
        message.reply('An error occurred while processing your command. Please try again later.');
    }
}

module.exports = { messageHandler };
