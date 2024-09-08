"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeBlocks = handleCodeBlocks;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:handleCodeBlocks');
/**
 * Parses and extracts code blocks from a message string.
 *
 * This function scans the input message for code blocks enclosed in triple backticks (```) and extracts
 * both the label (if present) and the content of each code block. It supports multiple code blocks in a
 * single message and handles labeled code blocks by identifying and separating the label from the content.
 *
 * @param {string} message - The message string containing one or more code blocks.
 * @returns {Array<{ label: string | null, content: string }>} An array of objects, each containing the label
 *          (if any) and the content of a code block.
 */
function handleCodeBlocks(message) {
    // Regular expression to match code blocks and their labels
    const codeBlockPattern = /```(\w+)?\s*(.*?)```/gs;
    const codeBlocks = [];
    let match;
    // Iterate over all matches of code blocks in the message
    while ((match = codeBlockPattern.exec(message)) !== null) {
        const label = match[1] ? match[1].trim() : null; // Extract and trim the label if it exists
        const content = match[2].trim(); // Extract and trim the code block content
        debug(`Found code block with label: ${label || 'none'}`);
        codeBlocks.push({ label, content }); // Store the label and content in the result array
    }
    return codeBlocks; // Return the array of code blocks with their labels and content
}
