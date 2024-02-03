const { aliases } = require('../config/aliases');
const commands = require('../commands'); // Assuming this imports your command modules
const logger = require('../utils/logger'); // Assuming you have a logger utility

async function commandHandler(message, commandContent) {
    try {
        const resolveCommand = (commandName) => {
            if (aliases[commandName]) {
                const [resolvedCommand, additionalArgs] = aliases[commandName].split(':');
                logger.debug(`Alias found: ${commandName} -> ${resolvedCommand} with additional args: ${additionalArgs}`);
                return [resolveCommand(resolvedCommand), additionalArgs]; // Recursive resolution
            }
            logger.debug(`No alias found for command: ${commandName}`);
            return [commandName, null];
        };

        const commandRegex = /(?:@bot\s+)?^!(\w+)(?::(\w+))?\s*(.*)/;
        const matches = commandContent.match(commandRegex);

        if (matches) {
            logger.debug(`Command regex match found: ${JSON.stringify(matches)}`);
            const [aliasResolvedCommand, aliasAction] = resolveCommand(matches[1].toLowerCase());
            const action = aliasAction || matches[2];
            const args = matches[3];
            const command = commands[aliasResolvedCommand];

            logger.debug(`Command Handler: Resolved Command - ${aliasResolvedCommand}, Action - ${action}, Args - ${args}`);

            if (command) {
                logger.debug(`Executing command: ${aliasResolvedCommand}`);
                await command.execute(message, action, args);
                logger.debug(`Executed command: ${aliasResolvedCommand}`);
            } else {
                logger.warn(`Unknown command: ${aliasResolvedCommand}`);
                message.reply(`Unknown command: ${aliasResolvedCommand}`);
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

module.exports = { commandHandler };
