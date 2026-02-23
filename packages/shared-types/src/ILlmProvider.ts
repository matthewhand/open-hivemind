import type { IMessage } from './IMessage';

/**
 * LLM Provider interface for dependency injection into adapters.
 */
export interface ILlmProvider {
    name: string;
    supportsChatCompletion: () => boolean;
    supportsCompletion: () => boolean;
    generateChatCompletion: (
        userMessage: string,
        historyMessages: IMessage[],
        metadata?: Record<string, any>
    ) => Promise<string>;
    generateStreamingChatCompletion?: (
        userMessage: string,
        historyMessages: IMessage[],
        onChunk: (chunk: string) => void,
        metadata?: Record<string, any>
    ) => Promise<string>;
    generateCompletion: (prompt: string) => Promise<string>;
}

/**
 * Factory function type for getting LLM providers.
 */
export type GetLlmProviderFn = (providerName: string, botName?: string) => ILlmProvider | null;
