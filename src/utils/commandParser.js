const logger = require('./logger');
const configManager = require('../config/configurationManager');

function parseCommand(commandContent) {
    
    if (!commandContent) {
        logger.warn('No command content provided to parseCommand');
        return null; // Or handle as appropriate
    }
    
    // Simplify logging by summarizing the parsing attempt
    logger.debug('Attempting to parse command content:  + commandContent + ');

    // Define regex for command parsing: !commandName:action args
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        // Destructure matches with sensible defaults
        const [, commandName, action = '', args = ''] = matches.map(match => match?.trim() || '');

        logger.debug('Parsed command - Name:  + commandName + , Action:  + action + , Args:  + args + ');
        return { commandName: commandName.toLowerCase(), action, args };
    } else {
        // Fallback to a default command if specified in the configuration
        const defaultCommand = configManager.getConfig('defaultCommand') || 'oai';

        // Extract arguments by removing bot mentions
        const argsWithoutMention = commandContent.replace(/<@!?\d+>\s*/, '').trim();

        if (defaultCommand && argsWithoutMention) {
            logger.debug('Fallback to default command:  + defaultCommand +  with args:  + argsWithoutMention + ');
            return { commandName: defaultCommand, action: '', args: argsWithoutMention };
        }
    }

    // Log a clear message if no command could be parsed
    logger.debug('Command content did not match expected pattern and no default command could be applied.');
    return null;
}

module.exports = { parseCommand };

