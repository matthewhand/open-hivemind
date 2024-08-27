import Debug from "debug";
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:validateMessage');

/**
 * Validates a message to ensure it contains text and has a valid author.
 *
 * This function checks whether a message has non-empty text content and a valid author ID.
 * It logs the validation result and handles any errors that occur during validation.
 *
 * @param {IMessage} message - The message object to validate.
 * @returns {boolean} - True if the message is valid, false otherwise.
 */
export function validateMessage(message: IMessage): boolean {
    try {
        const isValid = message.getText().length > 0 && message.getAuthorId() !== '';
        debug('Message validation ' + (isValid ? 'passed' : 'failed'));
        return isValid;
    } catch (error: any) {
        debug('Failed to validate message: ' + error.message);
        return false;
    }
}
