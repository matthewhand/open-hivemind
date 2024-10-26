import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');
const openAiService = OpenAiService.getInstance();

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat completion using OpenAI's service.
   */
  generateChatCompletion: async (
    userMessage: string,
    historyMessages: IMessage[]
  ): Promise<string> => {
    debug('Delegating chat completion to OpenAiService...');

    if (!historyMessages.length) {
      historyMessages = [{
        getText: () => userMessage,
        isFromBot: () => false,
      } as IMessage];
    }

    const result = await openAiService.generateChatCompletion(userMessage, historyMessages);
    return result ?? 'No response generated.';
  },

  /**
   * Minimal implementation of generateCompletion to satisfy ILlmProvider.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return `Completion for: ${prompt}`;  // Placeholder for now.
  },
};
