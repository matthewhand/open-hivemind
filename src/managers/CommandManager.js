const IMessage = require('../interfaces/IMessage');
const { getRandomErrorMessage } = require('../utils/commandManagerUtils');
const logger = require('../utils/logger');

/**
 * Manages the parsing and execution of commands within a Discord bot environment.
 * This class loads commands dynamically, checks command syntax, and executes them accordingly.
 */
class CommandManager {
    /**
     * Initializes a new instance of the CommandManager class.
     */
    constructor() {
        this.commands = require('../commands/inline'); // Dynamically load command modules
        this.aliases = require('../config/aliases');   // Load aliases for commands
        this.currentCommand = null;                    // Stores the last parsed command
    }

    /**
     * Parses the provided text to identify if it is a command.
     * @param {string} text - The text to parse for command syntax.
     * @returns {boolean} - True if a valid command is identified, otherwise false.
     */
    parseCommand(text) {
        logger.debug(`Attempting to parse command from text: "${text}"`);
        const match = text.match(/!(\w+)(?:\s+(.*))?/);
        if (!match) {
            logger.debug("No command pattern found in the text.");
            return false;
        }

        const [, command, argString] = match;
        const commandName = this.aliases[command.toLowerCase()] || command.toLowerCase();
        if (!this.commands[commandName]) {
            logger.debug(`Command '${commandName}' is not recognized. Available commands: ${Object.keys(this.commands).join(', ')}`);
            return false;
        }

        this.currentCommand = {
            commandName,
            args: argString ? argString.split(/\s+/) : []
        };

        logger.info(`Command parsed successfully: '${commandName}' with arguments: [${this.currentCommand.args.join(', ')}]`);
        return true;
    }

    /**
     * Executes the previously parsed command using the provided message context.
     * @param {IMessage} message - The message context to use for executing the command.
     * @returns {Promise<string>} - The result of the command execution or an error message.
     */
    async executeCommand(message) {
        if (!this.currentCommand) {
            logger.error("Attempt to execute a command without parsing any command text first.");
            return "No command has been parsed or command not recognized. Please try again.";
        }

        if (!(message instanceof IMessage)) {
            logger.error("The provided message object does not conform to the IMessage interface.");
            return "The provided message does not implement the required IMessage interface.";
        }

        const { commandName, args } = this.currentCommand;
        const commandFunction = this.commands[commandName];

        if (!commandFunction) {
            logger.warn(`Command '${commandName}' is not available. It might have been misspelled or does not exist.`);
            return "Command not found. Try `!help` for a list of commands.";
        }

        try {
            logger.info(`Executing command: '${commandName}' with arguments: [${args.join(', ')}]`);
            const result = await commandFunction.execute(message, args.join(' '), '');
            logger.info(`Command '${commandName}' executed successfully.`);
            return result;
        } catch (error) {
            logger.error(`Error while executing command '${commandName}': ${error.message}`, error);
            return getRandomErrorMessage();  // Returning a user-friendly error message
        }
    }
}

module.exports = CommandManager;
