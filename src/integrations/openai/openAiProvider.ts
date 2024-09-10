import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { generateChatResponse } from './operations/generateChatResponse';
import { generateCompletion } from './completion/generateCompletion';
import { OpenAiService } from './OpenAiService';

const debug = Debug('app:openAiProvider');

const openAiService = OpenAiService.getInstance();

export const openAiProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,

  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  generateChatCompletion: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    debug('Delegating chat completion to generateChatResponse...');

    // Fallback: If no historyMessages, create history from userMessage
    if (!historyMessages.length) {
      historyMessages = [{
        getText: () => userMessage,
        isFromBot: () => false,
      } as IMessage];
    }

    const options = {
      parallelExecution: false,
      maxRetries: 3,
      finishReasonRetry: 'length',
      isBusy: () => false,
      setBusy: (status: boolean) => debug('Service busy state:', status),
    };

    // Fix: Passing all four required arguments to generateChatResponse
    const result = await generateChatResponse(openAiService, userMessage, historyMessages, options);

    // Fix: Ensure result is either a valid string or a fallback value
    return result ?? 'No response generated.';
  },

  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);
    return generateCompletion(prompt);
  },
};
