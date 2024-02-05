const logger = require('../utils/logger');

function parseCommand(commandContent) {
    logger.debug(`Parsing command content: ${commandContent}`);

    // Adjusted regular expression to optionally capture action and arguments
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)?/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const commandName = matches[1].toLowerCase();
        const action = matches[2] ? matches[2].toLowerCase() : '';
        const args = matches[3] ? matches[3].trim() : '';

        logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ${args}`);
        return { commandName, action, args };
    }

    logger.debug('No command pattern matched in the content');
    return null;
}


module.exports = { parseCommand };
