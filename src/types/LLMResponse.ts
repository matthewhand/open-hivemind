import Debug from 'debug';

export interface LLMResponse {
    content: string;
    finishReason: string;
    completionTokens?: number; // Optional token count
}

