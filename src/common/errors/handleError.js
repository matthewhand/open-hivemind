"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = handleError;
const debug_1 = __importDefault(require("debug"));
const getRandomErrorMessage_1 = require("./getRandomErrorMessage");
const debug = (0, debug_1.default)('app:handleError');
/**
 * Handles errors by logging them and optionally sending a random error message to a message channel.
 *
 * @param error - The error object to be handled.
 * @param messageChannel - The message channel to send the error message to.
 */
function handleError(error, messageChannel = null) {
    debug(`Error Message: ${error.message}`);
    debug(`Error Stack Trace: ${error.stack}`);
    if (messageChannel && typeof messageChannel.send === 'function') {
        const errorMsg = (0, getRandomErrorMessage_1.getRandomErrorMessage)();
        messageChannel.send(errorMsg);
    }
}
