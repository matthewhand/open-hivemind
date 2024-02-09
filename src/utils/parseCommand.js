// parseCommand.js
const logger = require('./logger'); // Adjust the path as per your project structure

/**
 * Parses a command string and extracts the command name, action, and arguments.
 * @param {string} commandContent - The command string to parse.
 * @returns {?{commandName: string, action: string, args: string}} - The parsed command object or null if parsing fails.
 */
function parseCommand(commandContent) {
    // Check for non-empty command content
    if (!commandContent) {
        logger.warn('No command content provided to parseCommand');
        return null; // Early return for empty command strings
    }

    // Logging the attempt to parse the command content
    logger.debug(`Attempting to parse command content: "${commandContent}"`);

    // Regular expression to match the command pattern: !commandName:action args
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        // Extracting and trimming command parts
        const [, commandName, action = '', args = ''] = matches.map(match => match.trim());

        // Debug log for the parsed command details
        logger.debug(`Parsed command - Name: "${commandName}", Action: "${action}", Args: "${args}"`);

        // Returning the structured command object
        return {
            commandName: commandName.toLowerCase(), // Ensuring command name is case-insensitive
            action: action.toLowerCase(), // Lowercasing action for consistency
            args // Keeping arguments as a single string
        };
    }

    // Log if the command content did not match the expected pattern
    logger.debug('Command content did not match expected pattern and no default command could be applied.');
    return null; // Returning null if no command could be parsed
}

module.exports = { parseCommand };
