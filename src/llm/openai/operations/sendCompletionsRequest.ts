import Debug from "debug";

import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/operations/extractContent';
import { completeSentence } from '@src/llm/openai/operations/completeSentence';
import { needsCompletion } from '@src/llm/openai/operations/needsCompletion';

import { OpenAiService } from './OpenAiService';
import constants from '@config/ConfigurationManager';
export async function sendCompletionsRequest(manager: OpenAiService, message: string, dryRun: boolean = false): Promise<LLMResponse> {
    if (manager.isBusy()) {
        debug('[sendCompletionsRequest] Manager is currently busy.');
        return new LLMResponse('', 'busy');
    }
    manager.setBusy(true);
    debug('[sendCompletionsRequest] Sending request to OpenAI');
    try {
        const requestBody = {
            model: constants.LLM_MODEL,
            prompt: message,
            max_tokens: constants.LLM_RESPONSE_MAX_TOKENS,
            temperature: constants.LLM_TEMPERATURE,
            user: constants.INCLUDE_USERNAME_IN_COMPLETION ? 'assistant' : undefined,
        };
        if (dryRun) {
            debug('[sendCompletionsRequest] Dry run mode - returning request body only');
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
            debug('[sendCompletionsRequest] Completing response due to token limit or incomplete sentence.');
            content = await completeSentence(manager.getClient(), content, constants);
        }
        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        debug('[sendCompletionsRequest] Error during OpenAI API request: ' + error.message);
        return new LLMResponse('', 'error');
    } finally {
        manager.setBusy(false);
        debug('[sendCompletionsRequest] Manager set to not busy.');
    }
}
