import Debug from 'debug';
import OpenAiService from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@config/ConfigurationManager';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import { completeSentence } from '@src/integrations/openai/operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';
import { createChatCompletion } from './createChatCompletion';

const debug = Debug('app:sendChatCompletion');
const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llm');
const openaiConfig = configManager.getConfig('openai');

/**
 * Handles the process of sending a chat completion request to the OpenAI API.
 *
 * @param openAiService - Instance of OpenAiService to interact with the OpenAI API.
 * @param messages - Array of IMessage objects representing the conversation history.
 * @returns {Promise<LLMResponse>} - The response from the OpenAI API wrapped in an LLMResponse.
 */
export async function sendChatCompletion(
  openAiService: typeof OpenAiService,
  messages: IMessage[]
): Promise<LLMResponse> {
  if (!llmConfig) {
    debug('LLM config is missing.');
    return new LLMResponse('', 'config_error');
  }
  // @ts-ignore: Type instantiation is excessively deep and possibly infinite
  const parallelExecution = llmConfig.get<boolean>('LLM_PARALLEL_EXECUTION');

  if (!parallelExecution && openAiService.isBusy()) {
    debug('Service is busy with another request.');
    return new LLMResponse('', 'busy');
  }

  if (!parallelExecution) {
    openAiService.setBusy(true);
  }

  debug('Preparing messages for OpenAI API...');

  try {
    const response = await openAiService.createChatCompletion(messages);
    debug('API response received:', response);

    let content = response.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    let finishReason = response.choices[0]?.finish_reason || 'unknown';

    debug('Content:', content);
    debug('Tokens used:', tokensUsed);
    debug('Finish reason:', finishReason);

    if (finishReason === 'length') {
      const maxRetries = configManager.getConfig('openai')?.get<number>('OPENAI_MAX_RETRIES') || 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        debug(`Retrying completion due to ${finishReason} (attempt ${attempt})`);
        const newContent = await completeSentence(openAiService, content);
        content = newContent || content;
        finishReason = 'stop';
      }
    }

    return new LLMResponse(content, finishReason, tokensUsed);
  } catch (error: any) {
    debug('Error during API call:', error.message);
    return new LLMResponse('', 'error');
  } finally {
    if (!parallelExecution) {
      openAiService.setBusy(false);
      debug('Service marked as not busy after processing the request.');
    }
  }
}
