const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const { commandHandler } = require('./commandHandler');
const { sendLlmRequest } = require('../utils/messageUtils');
const { messageResponseManager } = require('../managers/messageResponseManager');

// Initialize the response manager
const manager = new messageResponseManager();

/**
 * Determines if the message content starts with the configured command prefix.
 * Defaults to '!' if no command prefix is configured.
 * @param {string} content - The content of the message.
 * @returns {boolean} - True if the message is a valid command.
 */
function isValidCommand(content) {
    const commandPrefix = configurationManager.getConfig('COMMAND_PREFIX') || '!'; // Use command prefix from config or default to '!'
    return content.startsWith(commandPrefix);
}

/**
 * Handles incoming messages, directing them to either command processing or dynamic response generation.
 * @param {Object} message - The Discord message object.
 */
async function messageHandler(message) {
    // Avoid processing bot messages if bot-to-bot interaction is disabled, except if explicitly allowed by configuration
    if (message.author.bot && configurationManager.getConfig('BOT_TO_BOT_MODE') !== 'true') {
        logger.debug('Bot-to-bot interaction is disabled. Ignoring bot message.');
        return;
    }

    const isCommand = isValidCommand(message.content);
    logger.debug(`Received message: ${message.content} | Is Command: ${isCommand}`);

    try {
        if (isCommand) {
            logger.info('Processing command...');
            await commandHandler(message);
            logger.info('Command processed successfully.');
        } else if (manager.shouldReplyToMessage(message.client.user.id, message)) {
            logger.info('Generating dynamic response...');
            await sendLlmRequest(message); // Assuming sendLlmRequest takes only the message object
            logger.info('Response sent successfully.');
        }
    } catch (error) {
        logger.error(`Error handling message: ${error.message}`, { error });
        // Respond to the user if the error handling strategy includes user notification
        if (!message.author.bot || configurationManager.getConfig('BOT_TO_BOT_MODE') === 'true') {
            message.reply('An error occurred. Please try again later.');
        }
    }
}

module.exports = { messageHandler };
