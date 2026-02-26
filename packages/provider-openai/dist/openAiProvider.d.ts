import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
export declare class OpenAiProvider implements ILlmProvider {
    name: string;
    private config;
    constructor(config?: any);
    supportsChatCompletion(): boolean;
    supportsCompletion(): boolean;
    generateChatCompletion(userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>): Promise<string>;
    generateCompletion(prompt: string): Promise<string>;
    private handleError;
}
export declare const openAiProvider: OpenAiProvider;
//# sourceMappingURL=openAiProvider.d.ts.map