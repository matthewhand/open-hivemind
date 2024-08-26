import Debug from 'debug';

const debug = Debug('app:isCommand');

/**
 * Checks if the provided text is a command.
 *
 * This function determines whether a given text string represents a command
 * by checking if it starts with the '!' character.
 *
 * @param text - The text string to check.
 * @returns True if the text is a command, false otherwise.
 */
export function isCommand(text: string): boolean {
    const isCmd = text.startsWith('!');
    debug('isCommand: ' + text + ' - ' + isCmd);
    return isCmd;
}
