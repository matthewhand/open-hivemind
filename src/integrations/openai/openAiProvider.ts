import { generateChatCompletion as openAiGenerateChatCompletion } from './operations/generateChatCompletion';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:openAiProvider');

export const openAiProvider = {
  generateChatCompletion: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    const llmProvider = getLlmProvider();  // Dynamically get LLM provider (e.g., Flowise or OpenAI)
    debug('Delegating chat completion to LLM provider...');
    // Delegate the call to the correct provider's generateChatCompletion
    return await llmProvider.generateChatCompletion(historyMessages, userMessage);
  }
};
