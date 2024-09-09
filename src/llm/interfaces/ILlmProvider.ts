/**
 * ILlmProvider interface defines the structure for any LLM provider implementation.
 * Providers should specify whether they support chat completions and/or non-chat completions.
 */
export interface ILlmProvider {
  /**
   * Indicates whether the provider supports chat completions.
   * @returns {boolean} True if chat completions are supported, false otherwise.
   */
  supportsChatCompletion: () => boolean;

  /**
   * Indicates whether the provider supports non-chat completions.
   * @returns {boolean} True if non-chat completions are supported, false otherwise.
   */
  supportsCompletion: () => boolean;

  /**
   * Generates a response based on the message history and the user message.
   * @param {IMessage[]} historyMessages - The message history to send to the LLM.
   * @param {string} userMessage - The latest user message.
   * @returns {Promise<string>} The generated response from the LLM.
   */
  generateResponse: (historyMessages: IMessage[], userMessage: string) => Promise<string>;
}
