import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../OpenAiService';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { createChatCompletion } from '@integrations/openai/chatCompletion/createChatCompletion';
import { retryRequest } from '@integrations/openai/chatCompletion/retryRequest';

const debug = Debug('app:OpenAiService');

/**
 * Fetch the first available OpenAI model.
 * @param openAiService - Instance for the request.
 * @returns {Promise<string>} - Model's ID.
 */
async function getFirstAvailableModel(openAiService: OpenAiService): Promise<string> {
  const models = await openAiService.openai.models.list();
  const model = models.data[0]?.id;
  if (!model) {
    throw new Error('No OpenAI model available');
  }
  return model;
}

/**
 * Generate a chat response using OpenAI.
 * @param openAiService - OpenAiService instance.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
 * @returns {Promise<string | null>} - Chat response or null.
 */
export async function generateChatResponse(
  openAiService: OpenAiService,
  message: string,
  historyMessages: IMessage[],
  options: {
    parallelExecution: boolean;
    maxRetries: number;
    finishReasonRetry: string;
    isBusy: () => boolean;
    setBusy: (status: boolean) => void;
  }
): Promise<string | null> {
  try {
    debug('message:', message);
    debug('historyMessages:', historyMessages);
    debug('options:', options);

    if (!message) {
      throw new Error('No input message provided.');
    }
    if (!historyMessages || historyMessages.length === 0) {
      throw new Error('No history messages provided.');
    }

    const model = await getFirstAvailableModel(openAiService);

    const systemMessageContent = 'Initializing system context...';

    if (options.isBusy()) {
      debug('Service is busy.');
      return null;
    }
    options.setBusy(true);

    // Use retry logic and chat completion functions
    const result = await retryRequest(() =>
      createChatCompletion(openAiService.openai, historyMessages, message, systemMessageContent, openaiConfig.get('OPENAI_MAX_TOKENS') ?? 150),
      options.maxRetries
    );

    options.setBusy(false);

    return result;
  } catch (error: any) {
    debug('Error:', error.message);
    options.setBusy(false);
    throw new Error(`Failed: ${error.message}`);
  }
}
