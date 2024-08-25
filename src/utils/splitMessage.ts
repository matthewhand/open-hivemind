import Debug from 'debug';
const debug = Debug('app:utils:splitMessage');

/**
 * Splits a message into chunks of a specified maximum length, ensuring no split occurs in the middle of a word.
 * 
 * @param message - The message to be split.
 * @param maxLength - The maximum length of each chunk. Defaults to 2000 characters.
 * @returns An array of message chunks.
 */
export function splitMessage(message: string, maxLength: number = 2000): string[] {
    if (!message || maxLength <= 0) {
        debug('Invalid message or maxLength provided.');
        return [];
    }
    const messageParts = message.match(new RegExp('.{1,' + maxLength + '}(\s|$)', 'g')) || [];
    debug('splitMessage: ' + messageParts);
    return messageParts;
}
