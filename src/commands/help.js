const Command = require('../utils/Command');
const commandHandlers = require('.'); // Import all command handlers from the current directory (commands/index.js)
const { aliases } = require('../config/aliases');
const logger = require('../utils/logger');
const { getRandomErrorMessage } = require('../config/errorMessages');

class HelpCommand extends Command {
    constructor() {
        super('help', 'Displays help message. Usage: !help [command]');
        this.help = 'The !help command displays a list of available commands and their descriptions. ' +
                    'You can also use it to get detailed help for a specific command by typing !help [command].';
    }

    async execute(message, args) {
        try {
            let helpMessage = this.help + '\n\n';

            if (args && args.trim()) {
                const commandName = args.trim().split(' ')[0]; // Get the first word as command name
                const command = commandHandlers[commandName];

                if (command && command.description) {
                    helpMessage = `Help for !${commandName}: ${command.description}`;
                } else {
                    helpMessage = `Detailed help for the command '!${commandName}' is pending.`;
                }
            } else {
                helpMessage += 'Available commands:\n';

                for (const [commandName, commandInstance] of Object.entries(commandHandlers)) {
                    if (commandInstance.description) {
                        helpMessage += `- !${commandName}: ${commandInstance.description}\n`;
                    }
                }

                helpMessage += '\nCommand Aliases:\n';
                for (const [alias, commandName] of Object.entries(aliases)) {
                    helpMessage += `- !${alias}: Translates to !${commandName}\n`;
                }
            }

            message.reply(helpMessage);
            logger.info('Help command executed successfully.');
        } catch (error) {
            logger.error(`Error in HelpCommand execute: ${error}`);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new HelpCommand();
