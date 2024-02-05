const { aliases } = require('../config/aliases');
const commands = require('../commands'); // Assuming this imports your command modules

// Function to parse command content
const logger = require('../utils/logger'); // Import logger utility

// Rest of your code...
function parseCommand(commandContent) {
    logger.debug(`Parsing command content: ${commandContent}`);
    
    const commandRegex = /(?:@bot\s+)?^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const commandName = matches[1].toLowerCase();
        const action = matches[2];
        const args = matches[3];
        
        logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ${args}`);
        return { commandName, action, args };
    }

    logger.debug('No command pattern matched in the content');
    return null; // Return null if no command is found
}


async function commandHandler(message, commandContent) {
    try {
        const resolvedCommand = parseCommand(commandContent);

        if (resolvedCommand) {
            const { commandName, action, args } = resolvedCommand;
            const resolvedAlias = aliases[commandName] || commandName;
            const command = commands[resolvedAlias];

            if (command) {
                await command.execute(message, action, args);
            } else {
                logger.warn(`Unknown command: ${commandName}`);
                message.reply(`Unknown command: ${commandName}`);
            }
        } else {
            logger.warn('No command found in the message');
            message.reply('No command found in the message');
        }
    } catch (error) {
        logger.error(`Error while handling command: ${commandContent}`, error);
        message.reply('An error occurred while processing your command.');
    }
}

module.exports = { commandHandler, parseCommand };
