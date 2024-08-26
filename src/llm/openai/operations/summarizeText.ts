import Debug from 'debug';

import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/operations/extractContent';
import { sendCompletionsRequest } from '@src/llm/openai/operations/sendCompletionsRequest';
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import constants from '@config/ConfigurationManager';

const debug = Debug('app:summarizeText');

/**
 * Summarizes a given user message using the OpenAI API.
 * @param manager - The OpenAiService instance to manage the request.
 * @param userMessage - The message content to be summarized.
 * @param systemMessageContent - The system prompt to guide the summarization.
 * @param maxTokens - The maximum number of tokens for the response.
 * @returns A promise that resolves to an LLMResponse containing the summary.
 */
export async function summarizeText(
    manager: OpenAiService,
    userMessage: string,
    systemMessageContent: string = constants.LLM_SYSTEM_PROMPT,
    maxTokens: number = constants.LLM_RESPONSE_MAX_TOKENS
): Promise<LLMResponse> {
    const prompt = systemMessageContent + '\nUser: ' + userMessage + '\nAssistant:';
    const requestBody = await manager.buildCompletionsRequest(prompt);
    const response = await sendCompletionsRequest(manager, JSON.stringify(requestBody));
    const summary = extractContent(response);
    debug('[summarizeText] Summary processed successfully.');
    return new LLMResponse(summary, 'completed');
}
