const logger = require('./logger');
const config = require('../config'); // Ensure correct import path

function parseCommand(commandContent) {
    logger.debug(`Parsing command content: ${commandContent}`);

    const commandRegex = /^!(\w+)(?::(\w+))?\s+(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const commandName = matches[1].toLowerCase();
        const action = matches[2] || '';
        const args = matches[3].trim();

        logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ${args}`);
        return { commandName, action, args };
    } else {
        const defaultCommand = config.defaultCommand || 'oai';
        if (defaultCommand) {
            // Adjusted regex to handle both types of mentions
            const argsWithoutMention = commandContent.replace(/<@!?(\d+)>\s*/, '');
            logger.debug(`Defaulting to command: ${defaultCommand} with args: ${argsWithoutMention}`);
            return { commandName: defaultCommand, action: '', args: argsWithoutMention };
        }
    }

    logger.debug('No command pattern matched in the content, and no default command defined');
    return null;
}

module.exports = { parseCommand };