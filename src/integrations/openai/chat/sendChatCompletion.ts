import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import { completeSentence } from '@src/integrations/openai/operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAI } from 'openai';

const debug = Debug('app:sendChatCompletion');
const configManager = ConfigurationManager.getInstance()();

/**
 * Handles the process of sending a chat completion request to the OpenAI API.
 *
 * @param openAiService - Instance of OpenAiService to interact with the OpenAI API.
 * @param messages - Array of IMessage objects representing the conversation history.
 * @returns {Promise<LLMResponse>} - The response from the OpenAI API wrapped in an LLMResponse.
 */
export async function sendChatCompletion(
  openAiService: OpenAiService,
  messages: IMessage[]
): Promise<LLMResponse> {
  const parallelExecution = configManager.LLM_PARALLEL_EXECUTION;

  if (!parallelExecution && openAiService.isBusy()) {
    debug('Service is busy with another request.');
    return new LLMResponse('', 'busy');
  }

  if (!parallelExecution) {
    openAiService.setBusy(true);
  }

  debug('Preparing messages for OpenAI API...');

  debug('Sending request to OpenAI API...');
  try {
    // Pass IMessage[] directly to createChatCompletion
    const response: OpenAI.Chat.ChatCompletion = await openAiService.createChatCompletion(messages);
    debug('API response received:', response);

    // Process the response to extract content, token usage, and finish reason
    let content = response.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = response.usage?.total_tokens || 0;
    let finishReason: OpenAI.Chat.ChatCompletion['choices'][0]['finish_reason'] = response.choices[0]?.finish_reason || 'unknown';

    debug('Content:', content);
    debug('Tokens used:', tokensUsed);
    debug('Finish reason:', finishReason);

    if (finishReason === 'length') {
      for (let attempt = 1; attempt <= configManager.OPENAI_MAX_RETRIES; attempt++) {
        debug(`Retrying completion due to ${finishReason} (attempt ${attempt})`);
        const newContent = await completeSentence(openAiService, content);
        content = newContent || content; // Update content if new content is returned
        finishReason = 'stop'; // Set finish reason after successful retry
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
