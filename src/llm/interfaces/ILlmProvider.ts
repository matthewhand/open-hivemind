import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * ILlmProvider interface defines the structure for any LLM provider implementation.
 * Providers must implement methods for chat and non‑chat completions.
 */
export interface ILlmProvider {
  /**
   * Indicates whether the provider supports chat completions.
   * @returns {boolean} True if chat completions are supported, false otherwise.
   */
  supportsChatCompletion: () => boolean;

  /**
   * Indicates whether the provider supports non‑chat completions.
   * @returns {boolean} True if non‑chat completions are supported, false otherwise.
   */
  supportsCompletion: () => boolean;

  /**
   * Generates a chat‑based completion.
   * @param userMessage - The latest user message.
   * @param historyMessages - The message history to send to the LLM.
   * @param metadata - Optional metadata object containing additional context (e.g., Slack metadata).
   * @returns A promise that resolves to the generated response from the LLM.
   */
  generateChatCompletion: (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>) => Promise<string>;

  /**
   * Generates a non‑chat completion.
   * @param prompt - The prompt to send to the LLM.
   * @returns A promise that resolves to the generated response from the LLM.
   */
  generateCompletion: (prompt: string) => Promise<string>;
}
