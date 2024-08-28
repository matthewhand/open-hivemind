import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';
import LLMResponse from '@src/llm/interfaces/LLMResponse';
import { extractContent } from './extractContent';
import { completeSentence } from '../completion/completeSentence';
import { needsCompletion } from '../completion/needsCompletion';

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
    if (!openAiService.parallelExecution && openAiService.isBusy()) {
        debug('The service is currently busy with another request.');
        return new LLMResponse('', 'busy');
    }
    if (!openAiService.parallelExecution) {
        openAiService.setBusy(true);
    }
    debug('Sending request to OpenAiService');
    debug('Request body: ' + JSON.stringify(requestBody, null, 2));
    try {
        const response = await openAiService.openai.chat.completions.create(requestBody);
        let content = extractContent(response.choices[0]);
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
        if (!openAiService.parallelExecution) {
            openAiService.setBusy(false);
            debug('Set busy to false after processing the request.');
        }
    }
}
