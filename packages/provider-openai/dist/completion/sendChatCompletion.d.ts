import type { IMessage } from '@src/message/interfaces/IMessage';
/**
 * Sends a chat completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the chat completion.
 * @returns {Promise<string>} - The generated chat response.
 */
export declare function sendChatCompletion(messages: IMessage[]): Promise<string>;
//# sourceMappingURL=sendChatCompletion.d.ts.map