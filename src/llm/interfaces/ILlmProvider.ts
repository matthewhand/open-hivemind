import type { IMessage } from '@src/message/interfaces/IMessage';

/** A single tool call as returned by an LLM during function calling. */
export interface LlmToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Minimal chat message shape used for multi-turn tool conversations.
 * This mirrors the OpenAI chat message structure but stays provider-neutral.
 */
export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  name?: string;
}

/** Provider-neutral tool definition (OpenAI function-calling shape). */
export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** The assistant turn returned from a tool-aware completion. */
export interface LlmToolCompletionResult {
  content: string | null;
  tool_calls?: LlmToolCall[];
}

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
   * Indicates whether the provider requires history to be passed by the caller.
   * Stateful providers (Flowise, OpenWebUI, Letta) manage their own history.
   * Defaults to true if not implemented.
   */
  supportsHistory?: () => boolean;

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
   * Generates a tool-aware chat completion using native function calling.
   *
   * Providers that support OpenAI-compatible function calling can implement
   * this to receive a fully-built messages array plus tool definitions and
   * return the assistant turn (which may contain tool calls). The caller
   * (toolAugmentedCompletion) drives the multi-turn tool loop.
   *
   * Providers that do not implement this method are routed through the
   * caller's direct fallback path, preserving existing behavior.
   *
   * @param {LlmChatMessage[]} messages - The full conversation so far
   * @param {LlmToolDefinition[]} tools - Tool definitions; empty for a final text turn
   * @param {Record<string, any>} [metadata] - Optional metadata for additional context
   * @returns {Promise<LlmToolCompletionResult>} The assistant turn
   */
  generateChatCompletionWithTools?: (
    messages: LlmChatMessage[],
    tools: LlmToolDefinition[],

    metadata?: Record<string, any>
  ) => Promise<LlmToolCompletionResult>;

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
   * Generates an embedding vector for the given text.
   *
   * Optional. Providers that support embeddings (e.g. OpenAI, OpenWebUI/Ollama)
   * implement this so they can back vector memory stores such as
   * PostgresMemoryProvider. Providers without embedding support omit it.
   *
   * @param {string} text - The text to embed
   * @returns {Promise<number[]>} A promise that resolves to the embedding vector
   */
  generateEmbedding?: (text: string) => Promise<number[]>;
}
