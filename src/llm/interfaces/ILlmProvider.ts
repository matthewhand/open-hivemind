import type { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Interface for Large Language Model (LLM) providers.
 *
 * This interface defines the contract for any LLM provider implementation,
 * supporting both chat-based and traditional text completions. Implementations
 * can be for OpenAI, Anthropic, local models, or any other LLM service.
 *
 * @interface
 * @example
 * ```typescript
 * class OpenAiProvider implements ILlmProvider {
 *   supportsChatCompletion() { return true; }
 *   supportsCompletion() { return true; }
 *
 *   async generateChatCompletion(userMessage, historyMessages, metadata) {
 *     // OpenAI chat completion implementation
 *   }
 *
 *   async generateCompletion(prompt) {
 *     // OpenAI text completion implementation
 *   }
 * }
 * ```
 */
export interface ILlmProvider {
  /**
   * The name of the provider (e.g., 'openai', 'flowise', 'openwebui')
   */
  name: string;

  /**
   * Indicates whether the provider supports chat completions.
   *
   * Chat completions maintain conversation context and are suitable for
   * interactive conversations with message history.
   *
   * @returns {boolean} True if chat completions are supported, false otherwise
   */
  supportsChatCompletion: () => boolean;

  /**
   * Indicates whether the provider supports non-chat completions.
   *
   * Non-chat completions are single-turn text generation without
   * conversation context or message history.
   *
   * @returns {boolean} True if non-chat completions are supported, false otherwise
   */
  supportsCompletion: () => boolean;

  /**
   * Generates a chat-based completion using conversation history.
   *
   * This method should handle the full conversation context including
   * system messages, user messages, and assistant responses.
   *
   * @param {string} userMessage - The latest user message to respond to
   * @param {IMessage[]} historyMessages - The complete message history for context
   * @param {Record<string, any>} [metadata] - Optional metadata for additional context
   * @returns {Promise<string>} A promise that resolves to the generated response
   *
   * @example
   * ```typescript
   * const response = await provider.generateChatCompletion(
   *   "What's the weather like?",
   *   [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi there!" }],
   *   { channel: "general", user: "john_doe" }
   * );
   * ```
   */
  generateChatCompletion: (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => Promise<string>;

  /**
   * Generates a streaming chat-based completion using conversation history.
   *
   * This method streams the response in chunks as they become available,
   * allowing for real-time display of the response.
   *
   * @param {string} userMessage - The latest user message to respond to
   * @param {IMessage[]} historyMessages - The complete message history for context
   * @param {(chunk: string) => void} onChunk - Callback function called for each chunk
   * @param {Record<string, any>} [metadata] - Optional metadata for additional context
   * @returns {Promise<string>} A promise that resolves to the complete generated response
   *
   * @example
   * ```typescript
   * const response = await provider.generateStreamingChatCompletion(
   *   "What's the weather like?",
   *   [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi there!" }],
   *   (chunk) => console.log('Received chunk:', chunk),
   *   { channel: "general", user: "john_doe" }
   * );
   * ```
   */
  generateStreamingChatCompletion?: (
    userMessage: string,
    historyMessages: IMessage[],
    onChunk: (chunk: string) => void,
    metadata?: Record<string, any>
  ) => Promise<string>;

  /**
   * Generates a non-chat text completion.
   *
   * This method performs single-turn text generation based solely on
   * the provided prompt without conversation context.
   *
   * @param {string} prompt - The text prompt to generate completion for
   * @returns {Promise<string>} A promise that resolves to the generated text
   *
   * @example
   * ```typescript
   * const response = await provider.generateCompletion(
   *   "Write a haiku about programming"
   * );
   * ```
   */
  generateCompletion: (prompt: string) => Promise<string>;

  /**
   * Validates the credentials for the provider.
   * This can involve checking if API keys are set, or making a test request to the API.
   *
   * @returns {Promise<boolean>} True if credentials are valid, false otherwise.
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Convenience alias for generating a response from a message object.
   * Delegates to generateChatCompletion or generateCompletion based on provider capabilities.
   *
   * @param {IMessage} message - The input message object.
   * @param {IMessage[]} [context] - Optional conversation history.
   * @returns {Promise<string>} The generated response text.
   */
  generateResponse(message: IMessage, context?: IMessage[]): Promise<string>;
}
