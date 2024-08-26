import Debug from 'debug';
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import constants from '@config/ConfigurationManager';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/operations/extractContent';
import { completeSentence } from '@src/llm/openai/operations/completeSentence';
import { needsCompletion } from '@src/llm/openai/operations/needsCompletion';
import { handleError, redactSensitiveInfo } from '@src/utils/commonUtils';

const debug = Debug('app:sendRequest');

/**
 * Sends a request to the OpenAiService API and processes the response.
 * 
 * @param openAiManager - The OpenAiService instance managing the request.
 * @param requestBody - The prepared request body for OpenAiService API.
 * @returns A Promise resolving to an LLMResponse.
 */
export async function sendRequest(
    openAiManager: OpenAiService,
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
    if (openAiManager.isBusy()) {
        debug('[OpenAiService.sendRequest] The manager is currently busy with another request.');
        return new LLMResponse('', 'busy');
    }
    openAiManager.setBusy(true);
    debug('[OpenAiService.sendRequest] Sending request to OpenAiService');
    debug('[OpenAiService.sendRequest] Request body: ' + JSON.stringify(requestBody, redactSensitiveInfo, 2));
    try {
        const response = await openAiManager.getClient().chat.completions.create(requestBody);
        let content = extractContent(response.choices[0]);
        let tokensUsed = response.usage ? response.usage.total_tokens : 0;
        let finishReason = response.choices[0].finish_reason;
        let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;
        if (
            constants.LLM_SUPPORTS_COMPLETIONS &&
            needsCompletion(maxTokensReached, finishReason, content)
        ) {
            debug('[OpenAiService.sendRequest] Completing the response due to reaching the token limit or incomplete sentence.');
            content = await completeSentence(openAiManager.getClient(), content, constants);
        }
        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        handleError(error);
        debug('Error occurred while processing request: ' + error.message);
        return new LLMResponse('', 'error');
    } finally {
        openAiManager.setBusy(false);
        debug('[OpenAiService.sendRequest] Set busy to false after processing the request.');
    }
}
