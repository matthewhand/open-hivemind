// handlers/commandHandler.js
const { aliases } = require('../config/aliases');
const commands = require('../commands/inline');
const logger = require('../utils/logger');
const { parseCommand } = require('../utils/commandParser');

function extractCommandContent(message) {
    return message.content.trim();
}

async function commandHandler(message) {
    try {
        // Use the utility function to extract command content
        const commandContent = extractCommandContent(message);
        const resolvedCommand = parseCommand(commandContent);
        logger.info(`Resolved command: ${JSON.stringify(resolvedCommand)}`);

        if (resolvedCommand) {
            const { commandName, action, args } = resolvedCommand;
            const resolvedAlias = aliases[commandName] || commandName;
            const command = commands[resolvedAlias];

            if (command) {
                logger.info(`Executing command: ${commandName} with action: ${action}, args: ${args}`);
                await command.execute(message, args, action);
            } else {
                logger.warn(`Unknown command: ${commandName}`);
                message.reply(`Unknown command: ${commandName}`);
            }
        } else {
            logger.warn('No command found in the message');
            message.reply('No command found in the message');
        }
    } catch (error) {
        logger.error(`Error while handling command: ${error}`, error);
        message.reply('An error occurred while processing your command.');
    }
}

module.exports = { commandHandler };
