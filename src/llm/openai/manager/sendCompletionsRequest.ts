import logger from '@src/utils/logger';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { completeSentence } from '@src/llm/openai/utils/completeSentence';
import { needsCompletion } from '@src/llm/openai/utils/needsCompletion';
import OpenAiManager from './OpenAiManager';
import constants from '@config/ConfigurationManager';

export async function sendCompletionsRequest(manager: OpenAiManager, message: string, dryRun: boolean = false): Promise<LLMResponse> {
    if (manager.isBusy()) {
        logger.warn('[sendCompletionsRequest] Manager is currently busy.');
        return new LLMResponse('', 'busy');
    }

    manager.setBusy(true);
    logger.debug('[sendCompletionsRequest] Sending request to OpenAI');

    try {
        const requestBody = await manager.buildCompletionsRequest(message);

        if (dryRun) {
            logger.debug('[sendCompletionsRequest] Dry run mode - returning request body only');
            return new LLMResponse(JSON.stringify(requestBody), 'dry-run');
        }

        const response = await manager.getClient().completions.create(requestBody);
        let content = extractContent(response.choices[0]);
        let tokensUsed = response.usage ? response.usage.total_tokens : 0;
        let finishReason = response.choices[0].finish_reason;
        let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;

        if (
            constants.LLM_SUPPORTS_COMPLETIONS &&
            needsCompletion(maxTokensReached, finishReason, content)
        ) {
            logger.info('[sendCompletionsRequest] Completing response due to token limit or incomplete sentence.');
            content = await completeSentence(manager.getClient(), content, constants);
        }

        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        logger.error('[sendCompletionsRequest] Error during OpenAI API request: ' + error.message);
        return new LLMResponse('', 'error');
    } finally {
        manager.setBusy(false);
        logger.debug('[sendCompletionsRequest] Manager set to not busy.');
    }
}
