const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { isCommand, parseCommandDetails, executeParsedCommand } = require('../utils/commandManagerUtils');

/**
 * Manages command operations including loading commands, parsing input texts, and executing commands.
 */
class CommandManager {
    /**
     * Initializes a new instance of the CommandManager class.
     */
    constructor() {
        this.commands = this.loadCommands('../commands/inline');
        this.aliases = require('../config/aliases');
        logger.debug("CommandManager initialized with commands and aliases.");
    }

    /**
     * Loads command modules from a specified directory.
     * @param {string} directory - The relative path to the directory containing command files.
     * @returns {object} A dictionary of command names to command instance objects.
     */
    loadCommands(directory) {
        const fullPath = path.resolve(__dirname, directory);
        const commandFiles = fs.readdirSync(fullPath);
        const commands = {};
    
        commandFiles.forEach(file => {
            if (file.endsWith('.js')) {
                const commandName = file.slice(0, -3);
                try {
                    const CommandClass = require(path.join(fullPath, file));
                    if (typeof CommandClass === 'function') {
                        commands[commandName] = new CommandClass();
                        logger.debug(`Command loaded: ${commandName}`);
                    } else {
                        logger.error(`The command module ${file} does not export a class.`);
                    }
                } catch (error) {
                    logger.error(`Failed to load command ${commandName}: ${error}`);
                }
            }
        });
        return commands;
    }
    
    /**
     * Executes a command based on the text received from an original message.
     * @param {IMessage} originalMsg - The original message object containing text to parse and execute.
     * @returns {Promise<object>} A promise that resolves to the result of the command execution.
     */
    async executeCommand(originalMsg) {
        const text = originalMsg.getText().trim();
        if (!isCommand(text)) {
            logger.debug("Text does not start with '!', not a command.");
            return { success: false, message: "Not a command.", error: "Invalid command syntax" };
        }

        const commandDetails = parseCommandDetails(text);
        if (!commandDetails) {
            logger.error("Failed to parse command details.");
            return { success: false, message: "Parsing error.", error: "Invalid command format" };
        }

        logger.debug(`Executing command: ${commandDetails.command} with arguments: [${commandDetails.args.join(', ')}]`);
        const executionResult = await executeParsedCommand(commandDetails, this.commands, this.aliases);
        if (!executionResult.success) {
            logger.error(`Command execution failed: ${executionResult.error}`);
        } else {
            logger.debug(`Command executed successfully: ${executionResult.result}`);
        }
        return executionResult;
    }
}

module.exports = CommandManager;
