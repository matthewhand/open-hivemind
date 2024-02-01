const axios = require('axios');
const { aliases } = require('../config/aliases');
const { commandHandler } = require('./commandHandler');
const { scheduleFollowUpRequest, shouldSendFollowUp } = require('../utils/followUpRequest');
const logger = require('../utils/logger');
const { config, saveConfig } = require('../config/configUtils');
const { splitMessage, getRandomDelay } = require('../utils/common');

// Handles incoming messages and decides on follow-up actions
async function messageHandler(message) {
    // Ignore messages from bots
    if (message.author.bot) {
        logger.debug('Ignoring bot message');
        return;
    }

    // Retrieve the handler alias from the runtime configuration
    const guildId = message.guild.id;
    const handlerAlias = config.guildHandlers && config.guildHandlers[guildId] ? config.guildHandlers[guildId] : 'oai';

    try {
        const modifiedMessageContent = `!${handlerAlias} ${message.content}`;
        await commandHandler(message, modifiedMessageContent);
        logger.info(`Handled message: ${message.id}`);

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
    } catch (error) {
        logger.error(`Error in messageHandler for message: ${message.id}, Error: ${error}`);
    }
}

module.exports = { messageHandler };
