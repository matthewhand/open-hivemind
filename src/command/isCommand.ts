import logger from '@src/utils/logger';

/**
 * Checks if the given text starts with a '!' followed by alphanumeric characters, indicating a command.
 * @param {string} text - The input text to check.
 * @returns {boolean} - True if the text is a command, otherwise false.
 */
export function isCommand(text: string): boolean {
    const commandPattern = /^!(\w+)/;
    const isCmd = commandPattern.test(text);
    logger.debug(`isCommand: ${text} - ${isCmd}`);
    return isCmd;
}
