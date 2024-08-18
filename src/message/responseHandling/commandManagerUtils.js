const logger = require('./logger'); // Assuming a logger utility for debug and error logging

/**
 * Utilities for parsing and executing commands based on chat inputs.
 */

/**
 * Checks if the given text starts with a '!' followed by alphanumeric characters, indicating a command.
 * @param {string} text - The input text to check.
 * @returns {boolean} - True if the text is a command, otherwise false.
 */
function isCommand(text) {
    const commandPattern = /^!(\w+)/;
    const isCmd = commandPattern.test(text);
    logger.debug(`isCommand: ${text} - ${isCmd}`);
    return isCmd;
}

/**
 * Parses the command and its arguments from the given text.
 * @param {string} text - The text containing the command to parse.
 * @returns {object|null} - Returns an object with `command` and `args` if the command is valid, otherwise null.
 */
function parseCommandDetails(text) {
    const match = text.match(/^!(\w+)\s*(.*)/);
    if (!match) {
        logger.error(`parseCommandDetails: Invalid command format - ${text}`);
        return null;
    }

    const command = match[1].toLowerCase();
    const args = match[2] ? match[2].split(/\s+/) : [];
    logger.debug(`parseCommandDetails: command - ${command}, args - [${args.join(', ')}]`);
    return { command, args };
}

/**
 * Executes the command using the provided command details, commands repository, and aliases.
 * @param {object} commandDetails - An object containing the command and its arguments.
 * @param {object} commands - A repository of available command instances.
 * @param {object} aliases - A mapping of command aliases to their respective command names.
 * @returns {Promise<object>} - The result of the command execution, formatted as an object.
 */
async function executeParsedCommand(commandDetails, commands, aliases) {
    if (!commandDetails) {
        logger.error("executeParsedCommand: commandDetails not provided");
        return { success: false, message: "Invalid command syntax.", error: "No command details provided." };
    }

    const { command, args } = commandDetails;
    const commandName = aliases[command] || command;
    const commandInstance = commands[commandName];

    if (!commandInstance) {
        logger.error(`executeParsedCommand: Command not found - ${commandName}`);
        return { success: false, message: "Command not available.", error: "Command implementation missing." };
    }

    try {
        const result = await commandInstance.execute(args);
        logger.debug(`executeParsedCommand: Executed command - ${commandName}, Result - ${result}`);
        return { success: true, result: result };
    } catch (error) {
        logger.error(`executeParsedCommand: Error executing command - ${commandName}, Error - ${error.message}`);
        return { success: false, message: "Error executing command.", error: error.message };
    }
}

module.exports = { isCommand, parseCommandDetails, executeParsedCommand };
