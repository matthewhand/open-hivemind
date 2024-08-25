import debug from '@src/operations/debug';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/operations/extractContent';
import { completeSentence } from '@src/llm/openai/operations/completeSentence';
import { needsCompletion } from '@src/llm/openai/operations/needsCompletion';
import OpenAiService from './OpenAiService';
import constants from '@config/ConfigurationManager';

export async function sendChatCompletionsRequest(manager: OpenAiService, historyMessages: any[], dryRun: boolean = false): Promise<LLMResponse> {
    if (manager.isBusy()) {
        debug.warn('[sendChatCompletionsRequest] Manager is currently busy.');
        return new LLMResponse('', 'busy');
    }

    manager.setBusy(true);
    debug.debug('[sendChatCompletionsRequest] Sending request to OpenAI');

    try {
        const requestBody = {
            model: constants.LLM_MODEL,
            messages: historyMessages.map((msg) => ({
                role: manager.isValidRole(msg.role) ? msg.role : 'user',
                content: msg.content,
                name: constants.INCLUDE_USERNAME_IN_CHAT_COMPLETION ? 'assistant' : undefined,
            })),
        };

        if (dryRun) {
            debug.debug('[sendChatCompletionsRequest] Dry run mode - returning request body only');
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
            debug.info('[sendChatCompletionsRequest] Completing response due to token limit or incomplete sentence.');
            content = await completeSentence(manager.getClient(), content, constants);
        }

        return new LLMResponse(content, finishReason, tokensUsed);
    } catch (error: any) {
        debug.error('[sendChatCompletionsRequest] Error during OpenAI API request: ' + error.message);
        return new LLMResponse('', 'error');
    } finally {
        manager.setBusy(false);
        debug.debug('[sendChatCompletionsRequest] Manager set to not busy.');
    }
}
