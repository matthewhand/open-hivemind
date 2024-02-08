// src/handlers/messageHandler.js
const logger = require('../utils/logger');
const { isValidCommand } = require('../utils/commandUtils');
const { commandHandler } = require('./commandHandler');
const { sendLlmRequest } = require('../utils/messageUtils');
const { DecideToRespond } = require('../managers/responseManager');
const { config } = require('../config/configUtils');

const decisionManager = new DecideToRespond();

async function messageHandler(message) {
    if (!message.author.bot || config.BOT_TO_BOT_MODE) {
        logger.debug('Bot-to-bot interaction is disabled. Ignoring bot message.');
        return;
    }


    logger.info(`Received message: ${message.content}`);
    const botId = message.client.user.id;

    try {
        if (isValidCommand(message.content, botId)) {
            logger.debug('Valid command identified, proceeding with commandHandler.');
            await commandHandler(message);
        } else if (decisionManager.shouldReplyToMessage(botId, message)) {
            logger.debug('Decision to respond made. Generating response.');
            await sendLlmRequest(message, "Your generated prompt based on message content");
        }
    } catch (error) {
        logger.error(`Error processing message: ${error}`, { message: message.content, error: error });
        if (!message.author.bot || constants.BOT_TO_BOT_MODE) {
            await message.reply('An error occurred. Please try again later.');
        }
    }
}

module.exports = { messageHandler };
