import Debug from 'debug';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import { extractContent } from '@src/integrations/openai/operations/extractContent';
import { completeSentence } from '@src/integrations/openai/operations/completeSentence';
import { needsCompletion } from '@src/integrations/openai/operations/needsCompletion';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import constants from '@config/ConfigurationManager';

/**
 * Handles sending chat completion requests to the OpenAI API.
 *
 * This function manages the process of preparing and sending a chat completion request.
 * It handles dry runs, manages the API request, processes the response, and manages any necessary completions
 * if the initial response is incomplete or reaches the token limit.
 *
 * Key Features:
 * - Dry run support for testing request payloads
 * - Manages complex responses with additional completions if needed
 * - Provides detailed logging for each step of the process
 *
 * @param manager - The OpenAiService managing the API interactions.
 * @param historyMessages - The history of messages leading up to this request.
 * @param dryRun - If true, returns the request body without sending it to the API.
 * @returns A promise resolving to an LLMResponse object containing the API response or error information.
 */

const debug = Debug('app:sendChatCompletionsRequest');

export async function sendChatCompletionsRequest(
  manager: OpenAiService,
  historyMessages: any[],
  dryRun: boolean = false
): Promise<LLMResponse> {
  if (manager.isBusy()) {
    debug('Manager is currently busy.');
    return new LLMResponse('', 'busy');
  }
  manager.setBusy(true);
  debug('Sending request to OpenAI');
  try {
    const requestBody = {
      model: ConfigurationManager.OPENAI_MODEL,
      messages: historyMessages.map((msg) => ({
        role: manager.isValidRole(msg.role) ? msg.role : 'user',
        content: msg.content,
        name: constants.LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION ? 'assistant' : undefined,
      })),
    };
    if (dryRun) {
      debug('Dry run mode - returning request body only');
      return new LLMResponse(JSON.stringify(requestBody), 'dry-run');
    }
    const response = await manager.getClient().chat.completions.create(requestBody);
    let content = extractContent(response.choices[0]);
    let tokensUsed = response.usage ? response.usage.total_tokens : 0;
    let finishReason = response.choices[0].finish_reason;
    let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;
    if (
      constants.LLM_SUPPORTS_COMPLETIONS &&
      needsCompletion(maxTokensReached, finishReason, content)
    ) {
      debug('Completing response due to token limit or incomplete sentence.');
      content = await completeSentence(manager.getClient(), content, constants);
    }
    return new LLMResponse(content, finishReason, tokensUsed);
  } catch (error: any) {
    debug('Error during OpenAI API request: ' + error.message);
    return new LLMResponse('', 'error');
  } finally {
    manager.setBusy(false);
    debug('Manager set to not busy.');
  }
}
