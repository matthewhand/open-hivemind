const ICommand = require('../../interfaces/ICommand');
const commandHandlers = require('.'); // This imports all command handlers from the current directory
const { aliases } = require('../../config/aliases');
const logger = require('../../utils/logger');

/**
 * Class representing the 'help' command.
 * @class HelpCommand
 * @extends ICommand
 */
class HelpCommand extends ICommand {
    /**
     * Constructs the help command object.
     */
    constructor() {
        super();
        this.name = 'help';
        this.description = 'Displays help message. Usage: !help [command]';
    }

    /**
     * Executes the help command and returns a structured response.
     * @param {string[]} args - Arguments provided to the help command.
     * @returns {Promise<CommandResponse>} The result of the command execution.
     */
    async execute(args) {
        logger.debug('Executing help command with args:', args);
        let helpMessage = this.description + '\n\nAvailable commands:\n';

        Object.entries(commandHandlers).forEach(([commandName, commandInstance]) => {
            helpMessage += `- !${commandName}: ${commandInstance.description}\n`;
            logger.debug(`Added ${commandName} to help message.`);
        });

        helpMessage += '\nCommand Aliases:\n';
        Object.entries(aliases).forEach(([alias, realCommand]) => {
            helpMessage += `- !${alias} translates to !${realCommand}\n`;
            logger.debug(`Added alias ${alias} for ${realCommand} to help message.`);
        });

        logger.info('Help command executed successfully.');
        return { success: true, message: helpMessage };
    }
}

module.exports = HelpCommand;  // Export the class for instantiation by CommandManager
