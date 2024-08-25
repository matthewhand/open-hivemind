import Debug from "debug";
const debug = Debug("app");

import Debug from 'debug';

const debug = Debug('app:command:parseCommandDetails');

/**
 * Parses the command details from a given input string.
 * 
 * @param {string} input - The input string containing the command and arguments.
 * @returns {{command: string, args: string[]}} The parsed command and arguments.
 */
export function parseCommandDetails(input: string): { command: string, args: string[] } {
    debug('Parsing command details from input: ' + input);
    const [command, ...args] = input.split(' ');
    debug('Parsed command: ' + command + ', args: ' + args.join(', '));
    return { command, args };
}
