import Debug from 'debug';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:generateCompletion');

/**
 * Generates a chat completion using the configured LLM provider.
 * @param prompt - The user message to process.
 * @param messages - The message history.
 * @param metadata - Metadata for the message context.
 * @returns A promise resolving to the generated completion text.
 */
export async function generateCompletion(prompt: string, messages: IMessage[], metadata: Record<string, any>): Promise<string> {
  try {
    debug('Starting completion generation for prompt:', prompt);
    const llmProvider = await getLlmProvider();
    if (!llmProvider.length) {
      throw new Error('No LLM providers available');
    }
    const result = await llmProvider[0].generateChatCompletion(prompt, messages, metadata);
    debug('Completion generated:', result);
    return result;
  } catch (error: unknown) {
    debug('Error generating completion:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
