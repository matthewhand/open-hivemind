import Debug from 'debug';
import llmConfig from '@config/llmConfig';

const debug = Debug('app:parseCommand');

export interface ParsedCommand {
  commandName: string;
  action: string;
  args: string;
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
  if (!commandContent || !commandContent.startsWith('!')) {
    debug('Not a command message.');
    return null;
  }
  
  debug('Attempting to parse command content: ' + commandContent);
  
  // Define regex for command parsing: !commandName:action args
  const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
  const matches = commandContent.match(commandRegex);
  
  if (matches) {
    const [, commandName, action = '', args = ''] = matches.map(match => match?.trim() || '');
    debug('Parsed command - Name: ' + commandName + '  Action: ' + action + ', Args: ' + args);
    return { commandName: commandName.toLowerCase(), action, args };
  } else {
    debug('Command content did not match expected pattern.');
    return null;
  }
}
