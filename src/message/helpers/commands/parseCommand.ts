import Debug from 'debug';

const debug = Debug('app:parseCommand');

export interface ParsedCommand {
  commandName: string;
  action: string;
  args: string[];
}

/**
 * Parses a command message, extracting the command name, action, and arguments.
 *
 * If the message does not start with an exclamation mark (!),
 * this function immediately returns null.
 *
 * @param commandContent - The content of the message to parse.
 * @returns The parsed command object or null if the message is not a command.
 */
export function parseCommand(commandContent: string): ParsedCommand | null {
  const trimmedContent = commandContent.trim();
  if (!trimmedContent || !trimmedContent.startsWith('!')) {
    debug('Not a command message.');
    return null;
  }
  
  debug('Attempting to parse command content: ' + trimmedContent);
  
  // Define regex for command parsing: !commandName:action args
  const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
  const matches = trimmedContent.match(commandRegex);
  
  if (matches) {
    const [, commandName, action = '', argsString = ''] = matches;
    const args = argsString.trim() ? argsString.trim().split(/\s+/) : [];
    debug('Parsed command - Name: ' + commandName + '  Action: ' + action + ', Args: ' + args.join(' '));
    return { commandName: commandName.toLowerCase(), action, args };
  } else {
    debug('Command content did not match expected pattern.');
    return null;
  }
}
