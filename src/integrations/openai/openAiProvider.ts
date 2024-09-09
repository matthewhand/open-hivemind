import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { generateChatResponse } from './operations/generateChatResponse';
import { generateCompletion } from './completion/generateCompletion';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');

const openAiService = new OpenAiService();

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  generateChatCompletion: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    debug('Delegating chat completion to generateChatResponse...');

    const options = {
      parallelExecution: false,
      maxRetries: 3,
      finishReasonRetry: 'length',
      isBusy: () => false,
      setBusy: (status: boolean) => debug('Service busy state:', status),
    };

    const result = await generateChatResponse(openAiService, userMessage, historyMessages, options);
    return result ?? 'No response generated.';
  },

  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return generateCompletion(prompt);
  },
};
