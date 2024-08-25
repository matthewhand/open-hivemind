import debug from '@src/operations/debug';

/**
 * Parses a command string and extracts the command name, action, and arguments.
 * 
 * @param commandContent - The command string to parse.
 * @returns The parsed command object or null if parsing fails.
 */
export function parseCommand(commandContent: string): { commandName: string, action: string, args: string } | null {
    if (!commandContent) {
        debug.warn('[parseCommand] No command content provided.');
        return null;
    }

    debug.debug('[parseCommand] Attempting to parse command content: ' + commandContent + '');

    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const [, commandName, action = '', args = ''] = matches.map(match => match.trim());

        debug.debug('[parseCommand] Parsed command - Name: ' + commandName + ', Action: ' + action + ', Args: ' + args);

        return {
            commandName: commandName.toLowerCase(),
            action: action.toLowerCase(),
            args
        };
    }

    debug.debug('[parseCommand] CommandHandler content did not match expected pattern.');
    return null;
}
