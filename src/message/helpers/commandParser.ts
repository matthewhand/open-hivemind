import Debug from "debug";

/**
 * Parses and validates command input from the user.
 * 
 * @param {string} input - The command input provided by the user.
 * @returns {object} An object containing the parsed command and arguments.
 */
export function parseCommand(input: string): { command: string; args: string[] } {
    debug('Parsing command input:', input);
    const [command, ...args] = input.split(' ');
    debug('Parsed command:', command, 'with arguments:', args);
    return { command, args };
}
