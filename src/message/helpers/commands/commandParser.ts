import Debug from "debug";

const debug = Debug('app:commandParser');

/**
 * Parse Command
 *
 * This function parses and validates command input from the user. It splits the input string into a command and its arguments,
 * ensuring that the command is correctly identified and separated from its arguments. The function also logs the parsing steps
 * for easier debugging.
 *
 * Key Features:
 * - Splits the input string into a command and its associated arguments.
 * - Logs detailed information about the parsing process.
 * - Returns an object containing the parsed command and arguments for further processing.
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
