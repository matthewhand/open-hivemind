import OpenAiManager from '@src/llm/openai/manager/OpenAiManager';
import constants from '@config/ConfigurationManager';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { completeSentence } from '@src/llm/openai/utils/completeSentence';
import { needsCompletion } from '@src/llm/openai/utils/needsCompletion';
import { handleError, redactSensitiveInfo } from '@src/utils/commonUtils';
import logger from '@src/utils/logger';

/**
 * Sends a request to the OpenAiManager API and processes the response.
 * 
 * @param openAiManager - The OpenAiManager instance managing the request.
 * @param requestBody - The prepared request body for OpenAiManager API.
 * @returns A Promise resolving to an LLMResponse.
 */
export async function sendRequest(
    openAiManager: OpenAiManager,
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
        logger.warn('[OpenAiManager.sendRequest] The manager is currently busy with another request.');
        return new LLMResponse('', 'busy');
    }

    openAiManager.setBusy(true);
    logger.debug('[OpenAiManager.sendRequest] Sending request to OpenAiManager');
    logger.debug('[OpenAiManager.sendRequest] Request body: ' + JSON.stringify(requestBody, redactSensitiveInfo, 2));

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
            logger.info('[OpenAiManager.sendRequest] Completing the response due to reaching the token limit or incomplete sentence.');
            content = await completeSentence(openAiManager.getClient(), content, constants);
        }

        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        handleError(error);
        return new LLMResponse('', 'error');
    } finally {
        openAiManager.setBusy(false);
        logger.debug('[OpenAiManager.sendRequest] Set busy to false after processing the request.');
    }
}
