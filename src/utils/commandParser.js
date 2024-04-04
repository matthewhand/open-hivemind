const logger = require('./logger');
const typeforce = require('typeforce');

function parseCommand(commandContent) {
    // Basic type check for commandContent
    typeforce('String', commandContent);

    logger.debug(`Attempting to parse command content: "${commandContent}"`);
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const [, commandName, action = '', args = ''] = matches.map(match => match?.trim() || '');
        logger.debug(`Parsed command - Name: "${commandName}", Action: "${action}", Args: "${args}"`);

        // Enforce the structure of the parsed command
        const parsedCommand = { commandName: commandName.toLowerCase(), action, args };
        typeforce({
            commandName: 'String',
            action: 'String',
            args: 'String',
        }, parsedCommand);

        return parsedCommand;
    }

    logger.debug('Command content did not match expected pattern.');
    return null;
}

module.exports = { parseCommand };
