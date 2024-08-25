import { encode } from 'gpt-tokenizer';
interface Message {
    content: string;
}
/**
 * Trims an array of messages to fit within a specified token limit, ensuring the most recent messages are retained.
 * 
 * @param messages - The array of messages to trim.
 * @param newPrompt - The prompt to include in the token count.
 * @param maxTokens - The maximum number of tokens allowed.
 * @returns The trimmed array of messages.
 */
export function trimMessagesByTokenCount(messages: Message[], newPrompt: string, maxTokens: number): Message[] {
    if (!messages || messages.length === 0) {
        debug('[trimMessagesByTokenCount] No messages provided.');
        return [];
    }
    if (!newPrompt || maxTokens <= 0) {
        debug('[trimMessagesByTokenCount] Invalid prompt or maxTokens provided.');
        return [];
    }
    let totalTokens = encode(newPrompt).length;
    const trimmedMessages: Message[] = [];
    for (const message of messages.reverse()) {
        const messageTokens = encode(message.content);
        if (totalTokens + messageTokens.length > maxTokens) break;
        trimmedMessages.unshift(message); // Ensure chronological order
        totalTokens += messageTokens.length;
    }
    debug('[trimMessagesByTokenCount] Trimmed history based on token count: ' + trimmedMessages.length + ' messages retained');
    return trimmedMessages;
}
