const { config, constants } = require('../utils/configUtils'); // Adjust based on actual path and structure
const logger = require('../utils/logger');
const { isValidCommand } = require('../utils/commandUtils');
const { commandHandler } = require('./commandHandler');
const { scheduleFollowUpRequest, shouldSendFollowUp } = require('../utils/followUpRequest');
const { getRandomDelay } = require('../utils/common');

async function messageHandler(message) {
    // Check if message is from a bot and if BOT_TO_BOT_MODE is disabled
    if (message.author.bot && !constants.BOT_TO_BOT_MODE) {
        logger.debug('Bot-to-bot interaction is disabled. Ignoring bot message.');
        return;
    }

    logger.info(`Received message: ${message.content}`);

    try {
        const botId = message.client.user.id;

        // Only proceed if the message is a valid command or BOT_TO_BOT_MODE is enabled
        if (isValidCommand(message.content, botId) || (message.author.bot && constants.BOT_TO_BOT_MODE)) {
            logger.debug('Proceeding to commandHandler.');
            await commandHandler(message);
        } else {
            logger.debug('Message did not match valid command criteria or was not from a bot while BOT_TO_BOT_MODE is enabled.');
        }

        // Follow-up logic remains unchanged
        const delay = getRandomDelay(config.FOLLOW_UP_MIN_DELAY, config.FOLLOW_UP_MAX_DELAY);
        setTimeout(async () => {
            if (!message.author.bot && await shouldSendFollowUp(message, config.unsolicitedChannelCap)) {
                logger.debug(`Checking for follow-up on message: ${message.id}`);
                await scheduleFollowUpRequest(message);
                logger.info(`Scheduled follow-up request for message: ${message.id}`);
            } else {
                logger.debug(`No follow-up required for message: ${message.id} or BOT_TO_BOT_MODE is not enabled for follow-ups.`);
            }
        }, delay);
    } catch (error) {
        logger.error(`Error in messageHandler for message: ${message.id}. Error: ${error.message}`, error);
        // Consider whether you want to reply to bot messages with errors in BOT_TO_BOT_MODE
        if (!message.author.bot || constants.BOT_TO_BOT_MODE) {
            await message.reply('An error occurred while processing your message. Please try again later.');
        }
    }
}

module.exports = { messageHandler };
