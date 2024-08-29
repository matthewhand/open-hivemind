import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import { completeSentence } from '@src/integrations/openai/operations/completeSentence';
import { needsCompletion } from '../completion/needsCompletion';
import { createChatCompletionRequestBody } from '@src/integrations/openai/chat/createChatCompletionRequestBody';

const debug = Debug('app:sendChatCompletionsRequest');
const configManager = new ConfigurationManager();

/**
 * Sends a chat completion request to the OpenAI API and processes the response.
 * Handles retries in case of incomplete responses.
 * 
 * @param openAiService - The OpenAiService instance managing the request.
 * @param requestBody - The prepared request body for OpenAiService API.
 * @returns A Promise resolving to an LLMResponse.
 */
export async function sendChatCompletionsRequest(
    openAiService: OpenAiService,
    requestBody: {
        model: string;
        messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>,
        max_tokens?: number,
        temperature?: number,
        top_p?: number,
        frequency_penalty?: number,
        presence_penalty?: number
    }
): Promise<LLMResponse> {
    const parallelExecution = configManager.LLM_PARALLEL_EXECUTION;

    if (!parallelExecution && openAiService.isBusy()) {
        debug('The service is currently busy with another request.');
        return new LLMResponse('', 'busy');
    }
    if (!parallelExecution) {
        openAiService.setBusy(true);
    }
    debug('Sending request to OpenAiService');
    debug('Request body: ' + JSON.stringify(requestBody, null, 2));
    try {
        // Directly call the utility function
        const response = await createChatCompletionRequestBody(requestBody);
        let content = response.choices[0]?.message?.content?.trim() || '';
        let tokensUsed = response.usage ? response.usage.total_tokens : 0;
        let finishReason = response.choices[0].finish_reason;
        let maxTokensReached = tokensUsed >= configManager.LLM_RESPONSE_MAX_TOKENS;
        
        for (let attempt = 1; attempt <= configManager.OPENAI_MAX_RETRIES && finishReason === configManager.OPENAI_FINISH_REASON_RETRY; attempt++) {
            debug(`Retrying completion due to ${finishReason} (attempt ${attempt})`);
            content = await completeSentence(openAiService, content);
            finishReason = finishReason === 'stop' ? 'completed' : finishReason;
        }

        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        debug('Error occurred while processing request: ' + error.message);
        return new LLMResponse('', 'error');
    } finally {
        if (!parallelExecution) {
            openAiService.setBusy(false);
            debug('Set busy to false after processing the request.');
        }
    }
}
