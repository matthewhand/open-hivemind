/**
 * ILlmProvider interface defines the structure for any LLM provider implementation.
 * It includes the ability to check if a provider supports non-chat completions
 * and to generate a response based on the message history and user input.
 */
import { IMessage } from '@src/message/interfaces/IMessage';

export interface ILlmProvider {
  /**
   * Determines if the LLM provider supports non-chat completions.
   * @returns {boolean} True if non-chat completions are supported, false otherwise.
   */
  supportsNonChat: () => boolean;

  /**
   * Generates a response based on message history and the latest user message.
   * @param {IMessage[]} historyMessages - The history of previous messages.
   * @param {string} userMessage - The latest user message.
   * @returns {Promise<string>} The generated response.
   */
  generateResponse: (historyMessages: IMessage[], userMessage: string) => Promise<string>;
}
