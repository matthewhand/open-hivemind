const IMessage = require('../interfaces/IMessage');

/**
 * Manages command parsing and execution for a Discord bot.
 * This manager handles identifying if a piece of text is a command and then processes it accordingly,
 * sending responses through a designated channel.
 */
class CommandManager {
    /**
     * Constructs the command manager and initializes command configurations.
     * @param {function} responseHandler - Function to handle responses. This function accepts the response text and the channel ID.
     * @param {string} channelId - The default channel ID where responses will be sent.
     */
    constructor(responseHandler, channelId) {
        this.commands = require('../commands/inline');  // Loads all inline commands
        this.aliases = require('../config/aliases');    // Loads command aliases
        this.logger = require('../utils/logger');       // Logger utility for logging information
        this.responseHandler = responseHandler;         // Function to handle posting responses
        this.channelId = channelId;                     // Default channel ID for responses
    }

    /**
     * Parses the command from the provided text.
     * 
     * @param {string} text - Text to parse the command from.
     * @returns {Object|null} - The parsed command object if successful, null if command is unrecognized.
     */
    async parseCommand(text) {
        const parts = text.match(/!(\w+)(?:\s+(.*))?/);  // Regex to identify command patterns
        if (!parts) {
            this.logger.debug('No command pattern found in the text.');
            return null;
        }

        const [, command, argString] = parts;
        const args = argString ? argString.split(/\s+/) : [];
        const commandName = command.toLowerCase();

        if (!this.commands[commandName]) {
            this.logger.debug(`Command ${commandName} is not recognized.`);
            return null;
        }

        return { commandName, args };
    }

    /**
     * Executes a parsed command using the provided message context.
     * 
     * @param {Object} commandObj - An object containing the parsed command details.
     * @param {IMessage} message - The message context to use for executing the command.
     * @returns {Promise<boolean>} - True if the command was executed successfully, false otherwise.
     */
    async executeCommand(commandObj, message) {
        const { commandName, args } = commandObj;
        const resolvedAlias = this.aliases[commandName] || commandName;
        const command = this.commands[resolvedAlias];

        if (!command) {
            this.logger.warn(`Command ${commandName} is not available.`);
            return false;
        }

        try {
            this.logger.info(`Executing command: ${resolvedAlias}, Args: ${args.join(' ')}`);
            await command.execute(message, args.join(' '), '');  // Executes the command; assumes 'action' is not used
            return true;
        } catch (error) {
            this.logger.error(`Error executing command: ${resolvedAlias}`, error);
            return false;
        }
    }

    /**
     * Processes the command from the given message.
     * This method parses the command and, if valid, executes it. It ensures that a response is always sent,
     * either acknowledging the command's execution or indicating an error.
     * 
     * @param {IMessage} message - The message object implementing the IMessage interface.
     * @returns {Promise<boolean>} - True if a command was executed, false otherwise.
     */
    async processCommand(message) {
        if (!(message instanceof IMessage)) {
            throw new TypeError("Provided message does not implement IMessage interface");
        }

        const commandContent = message.getText().trim();
        const commandObj = await this.parseCommand(commandContent);

        if (!commandObj) {
            this.logger.debug('Invalid command or command format. Please check and try again.', this.channelId);
            return false;
        }

        return await this.executeCommand(commandObj, message);
    }
}

module.exports = CommandManager;
