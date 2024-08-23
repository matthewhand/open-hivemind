import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { completeSentence } from '@src/llm/openai/utils/completeSentence';
import { needsCompletion } from '@src/llm/openai/utils/needsCompletion';
import { handleError, redactSensitiveInfo } from '@src/utils/commonUtils';
import logger from '@src/utils/logger';

/**
 * Sends a request to the OpenAI API and processes the response.
 * 
 * @param openAiManager - The OpenAI instance managing the request.
 * @param requestBody - The prepared request body for OpenAI API.
 * @returns A Promise resolving to an LLMResponse.
 */
export async function sendRequest(
    openAiManager: OpenAI,
    requestBody: Record<string, any>
): Promise<LLMResponse> {
    if (openAiManager.isBusy()) {
        logger.warn('[OpenAI.sendRequest] The manager is currently busy with another request.');
        return new LLMResponse('', 'busy');
    }

    openAiManager.setBusy(true);
    logger.debug('[OpenAI.sendRequest] Sending request to OpenAI');
    logger.debug('[OpenAI.sendRequest] Request body: ' + JSON.stringify(requestBody, redactSensitiveInfo, 2));

    try {
        const response = await openAiManager.chat.completions.create(requestBody);
        let content = extractContent(response.choices[0]);
        let tokensUsed = response.usage.total_tokens;
        let finishReason = response.choices[0].finish_reason;
        let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;

        if (
            constants.LLM_SUPPORTS_COMPLETIONS &&
            needsCompletion(maxTokensReached, finishReason, content)
        ) {
            logger.info('[OpenAI.sendRequest] Completing the response due to reaching the token limit or incomplete sentence.');
            content = await completeSentence(openAiManager, content, constants);
        }

        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        handleError(error);
        return new LLMResponse('', 'error');
    } finally {
        openAiManager.setBusy(false);
        logger.debug('[OpenAI.sendRequest] Set busy to false after processing the request.');
    }
}
