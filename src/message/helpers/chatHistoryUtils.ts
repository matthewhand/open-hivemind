import Debug from "debug";

/**
 * Processes chat history and retrieves relevant context.
 * 
 * @param {string[]} messages - The array of messages to process.
 * @returns {string} The relevant context extracted from the chat history.
 */
export function processChatHistory(messages: string[]): string {
    debug('Starting to process chat history with messages:', messages);

    // Example logic to process chat history
    const filteredMessages = messages.filter(message => message.trim() !== '');
    const context = filteredMessages.join(' ');

    debug('Filtered messages:', filteredMessages);
    debug('Extracted context:', context);

    return context;
}
