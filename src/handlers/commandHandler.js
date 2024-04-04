const { parseCommand } = require('../utils/commandParser');
const { aliases } = require('../config/aliases');
const commands = require('../commands/inline');
const logger = require('../utils/logger');
const typeforce = require('typeforce');

// Define a type for the expected structure of a Discord message
const DiscordMessage = {
  content: 'String',
  // Add more properties as needed, depending on what your commands use
};

async function commandHandler(message) {
    try {
        // Ensure the message object has the expected structure
        typeforce(DiscordMessage, message);
        const commandContent = message.content.trim();
        
        const resolvedCommand = parseCommand(commandContent);
        if (!resolvedCommand) {
            message.reply('No command found in the message.');
            return;
        }

        // Check for valid command structure
        typeforce({
            commandName: 'String',
            action: 'String',
            args: 'String',
        }, resolvedCommand);

        const { commandName, action, args } = resolvedCommand;
        const resolvedAlias = aliases[commandName] || commandName;
        const command = commands[resolvedAlias];

        if (command) {
            logger.info(`Executing command: ${commandName} with action: ${action}, args: ${args}`);
            await command.execute(message, args, action);
        } else {
            logger.warn(`Unknown command: ${commandName}`);
            message.reply(`Unknown command: '${commandName}'. Try '!help' for a list of commands.`);
        }
    } catch (error) {
        logger.error(`Error while handling command: ${message.content}`, error);
        message.reply('An error occurred while processing your command.');
    }
}

module.exports = { commandHandler };
