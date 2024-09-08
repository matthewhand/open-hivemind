"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatHistory = processChatHistory;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:processChatHistory');
/**
 * Process Chat History
 *
 * This function processes an array of chat messages to retrieve relevant context for further use. It filters out empty messages,
 * concatenates the remaining ones, and returns the resulting context. This can be used to maintain a coherent conversation history.
 *
 * Key Features:
 * - Filters out empty or whitespace-only messages from the chat history.
 * - Concatenates the remaining messages to form a coherent context.
 * - Logs detailed information about the processing steps for easier debugging.
 *
 * @param {string[]} messages - The array of messages to process.
 * @returns {string} The relevant context extracted from the chat history.
 */
function processChatHistory(messages) {
    debug('Starting to process chat history with messages:', messages);
    // Example logic to process chat history
    const filteredMessages = messages.filter(message => message.trim() !== '');
    const context = filteredMessages.join(' ');
    debug('Filtered messages:', filteredMessages);
    debug('Extracted context:', context);
    return context;
}
