"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMessage = validateMessage;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:validateMessage');
/**
 * Validates a message to ensure it contains text and has a valid author.
 *
 * This function checks whether a message has non-empty text content and a valid author ID.
 * It logs the validation result and handles any errors that occur during validation.
 *
 * @param {IMessage} message - The message object to validate.
 * @returns {boolean} - True if the message is valid, false otherwise.
 */
function validateMessage(message) {
    try {
        const isValid = message.getText().length > 0 && message.getAuthorId() !== '';
        debug('Message validation ' + (isValid ? 'passed' : 'failed'));
        return isValid;
    }
    catch (error) {
        debug('Failed to validate message: ' + error.message);
        return false;
    }
}
