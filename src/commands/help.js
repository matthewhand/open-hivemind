const commandHandlers = require('.'); // Import all command handlers from the current directory (commands/index.js)
const { aliases } = require('../config/aliases');
const logger = require('../utils/logger');

const data = {
    name: 'help',
    description: 'Displays help message. Usage: !help [command]',
    help: 'The !help command displays a list of available commands and their descriptions. ' +
          'You can also use it to get detailed help for a specific command by typing !help [command].'
};

async function execute(message, args) {
    try {
        let helpMessage = '';

        if (args && args.trim()) {
            const commandName = args.trim().split(' ')[0]; // Get the first word as command name
            const command = commandHandlers[commandName];

            if (command && command.description) {
                helpMessage = `Help for !${commandName}: ${command.description}`;
            } else {
                helpMessage = `Detailed help for the command '!${commandName}' is pending.`;
            }
        } else {
            // Default help message for !help
            helpMessage = data.help + '\n\nAvailable commands:\n';

            for (const [command, handler] of Object.entries(commandHandlers)) {
                if (handler.description) {
                    helpMessage += `- !${command}: ${handler.description}\n`;
                }
            }

            helpMessage += '\nCommand Aliases:\n';
            for (const [alias, command] of Object.entries(aliases)) {
                helpMessage += `- !${alias}: Translates to !${command}\n`;
            }
        }

        message.reply(helpMessage);
        logger.info('Help command executed successfully.');
    } catch (error) {
        logger.error(`Error in handleHelpCommand: ${error.message}`);
        message.reply('An error occurred while displaying the help message.');
    }
}

module.exports = { data, execute };
