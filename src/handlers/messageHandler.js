jest.mock('../../src/handlers/commandHandler', () => ({
    commandHandler: jest.fn().mockImplementation((message) => {
      if (message.content.includes('commandCausingError')) {
        throw new Error('Test error');
      }
    }),
  }));

const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const { commandHandler } = require('./commandHandler');
const { sendLlmRequest } = require('../utils/messageUtils');
const { messageResponseManager } = require('../managers/messageResponseManager');

const manager = new messageResponseManager();

function isValidCommand(content, botId) {
    const commandPrefix = '!';
    return content.startsWith(commandPrefix);
}

async function messageHandler(message) {
    const botToBotModeEnabled = configurationManager.getConfig('BOT_TO_BOT_MODE') === 'true';

    if (message.author.bot && !botToBotModeEnabled) {
        logger.info('Bot-to-bot interaction is disabled. Ignoring bot message.');
        return;
    }

    logger.info(`Received message: ${message.content}`);
    const botId = message.client.user.id;

    // First check for valid commands
    if (isValidCommand(message.content, botId)) {
        try {
            logger.info('Valid command identified, proceeding with commandHandler.');
            await commandHandler(message);
        } catch (error) {
            // Handle errors specifically from commandHandler
            logger.error(`Error in commandHandler: ${error.message}`, { error });
            message.reply('An error occurred while processing your command.');
        }
        return; // Early return to prevent further processing
    }

    // Separate try-catch for other operations
    try {
        if (manager.shouldReplyToMessage(botId, message)) {
            logger.info('Decision to respond made. Generating response.');
            await sendLlmRequest(message, "Response based on dynamic decision making.");
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, { message: message.content, error: error.stack });
        if (!message.author.bot || botToBotModeEnabled) {
            message.reply('An error occurred. Please try again later.');
        }
    }
}

module.exports = { messageHandler };
