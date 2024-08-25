import configManager from '@config/ConfigurationManager';

interface ParsedCommand {
    commandName: string;
    action: string;
    args: string;
}

/**
 * Parses the content of a command message.
 * Extracts the command name, action, and arguments.
 *
 * @param {string} commandContent - The content of the command message.
 * @returns {ParsedCommand | null} The parsed command object, or null if parsing failed.
 */
export function parseCommand(commandContent: string): ParsedCommand | null {
    if (!commandContent) {
        debug.warn('No command content provided to parseCommand');
        return null;
    }

    debug.debug('Attempting to parse command content: ' + commandContent);

    // Define regex for command parsing: !commandName:action args
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const [, commandName, action = '', args = ''] = matches.map(match => match?.trim() || '');

        debug.debug('Parsed command - Name: ' + commandName + ', Action: ' + action + ', Args: ' + args);
        return { commandName: commandName.toLowerCase(), action, args };
    } else {
        const defaultCommand = configManager.getConfig('defaultCommand', 'oai');
        const argsWithoutMention = commandContent.replace(/<@!?\d+>\s*/, '').trim();

        if (defaultCommand && argsWithoutMention) {
            debug.debug('Fallback to default command: ' + defaultCommand + ' with args: ' + argsWithoutMention);
            return { commandName: defaultCommand, action: '', args: argsWithoutMention };
        }
    }

    debug.debug('CommandHandler content did not match expected pattern and no default command could be applied.');
    return null;
}
