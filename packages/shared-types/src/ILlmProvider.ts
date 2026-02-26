import type { IMessage } from './IMessage';

/**
 * LLM Provider interface for generating chat completions.
 * Adapters use this to generate responses via injected LLM providers.
 */
export interface ILlmProvider {
  /** Provider name */
  name: string;
  /** Whether this provider supports chat completion */
  supportsChatCompletion: () => boolean;
  /** Whether this provider supports plain completion */
  supportsCompletion: () => boolean;
  /** Generate a chat completion response */
  generateChatCompletion: (
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ) => Promise<string>;
  /** Generate a streaming chat completion (optional) */
  generateStreamingChatCompletion?: (
    userMessage: string,
    historyMessages: IMessage[],
    onChunk: (chunk: string) => void,
    metadata?: Record<string, any>
  ) => Promise<string>;
  /** Generate a plain completion */
  generateCompletion: (prompt: string) => Promise<string>;
}
