import Debug from "debug";

const debug = Debug('app:processChatHistory');

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
export function processChatHistory(messages: string[]): string {
    debug('Starting to process chat history with messages:', messages);

    // Example logic to process chat history
    const filteredMessages = messages.filter(message => message.trim() !== '');
    const context = filteredMessages.join(' ');

    debug('Filtered messages:', filteredMessages);
    debug('Extracted context:', context);

    return context;
}
