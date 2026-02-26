import type { IMessage } from '@message/interfaces/IMessage';
/**
 * Generates a chat completion using the configured LLM provider.
 * @param prompt - The user message to process.
 * @param messages - The message history.
 * @param metadata - Metadata for the message context.
 * @returns A promise resolving to the generated completion text.
 */
export declare function generateCompletion(prompt: string, messages: IMessage[], metadata: Record<string, any>): Promise<string>;
//# sourceMappingURL=generateCompletion.d.ts.map