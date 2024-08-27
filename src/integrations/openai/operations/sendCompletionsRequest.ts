import Debug from 'debug';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/integrations/openai/operations/extractContent';
import { completeSentence } from '@src/integrations/openai/operations/completeSentence';
import { needsCompletion } from '@src/integrations/openai/operations/needsCompletion';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import constants from '@config/ConfigurationManager';

const debug = Debug('app:sendCompletionsRequest');

/**
 * Sends a completion request to the OpenAI API.
 *
 * Manages the preparation and sending of a completion request to the API,
 * including dry run support, and handles potential issues like token limits or incomplete sentences.
 *
 * Key Features:
 * - Handles dry runs for testing the request body
 * - Supports completion of responses if they are incomplete or exceed token limits
 * - Logs the process and handles errors gracefully
 *
 * @param manager - The OpenAiService managing the API interactions.
 * @param message - The message prompt for the completion request.
 * @param dryRun - If true, returns the request body without sending it to the API.
 * @returns A promise resolving to an LLMResponse object containing the API response or error information.
 */
export async function sendCompletionsRequest(manager: OpenAiService, message: string, dryRun: boolean = false): Promise<LLMResponse> {
    if (manager.isBusy()) {
        debug('Manager is currently busy.');
        return new LLMResponse('', 'busy');
    }
    manager.setBusy(true);
    debug('Sending request to OpenAI');
    try {
        const requestBody = {
            model: constants.OPENAI_MODEL,
            prompt: message,
            max_tokens: constants.LLM_RESPONSE_MAX_TOKENS,
            temperature: constants.LLM_TEMPERATURE,
            user: constants.INCLUDE_USERNAME_IN_COMPLETION ? 'assistant' : undefined,
        };
        if (dryRun) {
            debug('Dry run mode - returning request body only');
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
