import Debug from 'debug';
import type { IMessage } from '@src/message/interfaces/IMessage';

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
    const text = message.getText();
    const textLength = text.length;
    const authorId = message.getAuthorId();

    debug(`Validating message ID: ${message.getMessageId()}`);
    debug(`Message text length: ${textLength}, Text: "${text}"`);
    debug(`Message author ID: ${authorId}`);

    const isValid = textLength > 0 && authorId !== '';
    debug(`Message validation ${isValid ? 'passed' : 'failed'}`);
        
    return isValid;
  } catch (error: any) {
    debug('Failed to validate message: ' + error.message);
    return false;
  }
}
