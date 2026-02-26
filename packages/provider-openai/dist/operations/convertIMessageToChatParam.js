"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertIMessageToChatParam = convertIMessageToChatParam;
/**
 * Converts IMessage to OpenAI API format.
 * @param message - The IMessage object to convert.
 * @returns An object compatible with OpenAI chat API.
 */
function convertIMessageToChatParam(message) {
    return {
        role: message.role,
        content: message.content,
        name: message.getAuthorId() || 'unknown', // Ensure name is always a string
    };
}
