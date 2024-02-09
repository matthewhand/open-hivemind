const configurationManager = require('../config/configurationManager'); // Adjust the path as needed
const logger = require('../utils/logger');
const { commandHandler } = require('./commandHandler');
const { sendLlmRequest } = require('../utils/messageUtils');
const { messageResponseManager } = require('../managers/messageResponseManager');

const manager = new messageResponseManager();

/**
 * Checks if a given message content represents a valid command.
 * @param {string} content - The content of the message to check.
 * @param {string} botId - The ID of the bot to check for mentions.
 * @returns {boolean} - Returns true if the message content is a valid command.
 */
function isValidCommand(content, botId) {
    const commandPrefix = '!'; // Assuming commands start with '!'
    return content.startsWith(commandPrefix);
}

async function messageHandler(message) {
    // Use the configuration manager to check if BOT_TO_BOT_MODE is enabled.
    const botToBotModeEnabled = configurationManager.getConfig('BOT_TO_BOT_MODE') === 'true';

    if (message.author.bot && !botToBotModeEnabled) {
        logger.info('Bot-to-bot interaction is disabled. Ignoring bot message.');
        return;
    }

    logger.info(`Received message: ${message.content}`);
    const botId = message.client.user.id;

    try {
        if (isValidCommand(message.content, botId)) {
            logger.info('Valid command identified, proceeding with commandHandler.');
            await commandHandler(message);
        } else if (manager.shouldReplyToMessage(botId, message)) {
            logger.info('Decision to respond made. Generating response.');
            await sendLlmRequest(message, "Response based on dynamic decision making.");
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, { message: message.content, error: error.stack });
        // Use botToBotModeEnabled for consistency
        if (!message.author.bot || botToBotModeEnabled) {
            await message.reply('An error occurred. Please try again later.');
        }
    }
}

module.exports = { messageHandler };
