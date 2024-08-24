import logger from '@src/utils/logger';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { sendCompletionsRequest } from './sendCompletionsRequest';
import OpenAiManager from './OpenAiManager';
import constants from '@config/ConfigurationManager';

export async function summarizeText(
    manager: OpenAiManager,
    userMessage: string,
    systemMessageContent: string = constants.LLM_SYSTEM_PROMPT,
    maxTokens: number = constants.LLM_RESPONSE_MAX_TOKENS
): Promise<LLMResponse> {
    const prompt = systemMessageContent + '\nUser: ' + userMessage + '\nAssistant:';
    const requestBody = await manager.buildCompletionsRequest(prompt);
    const response = await sendCompletionsRequest(manager, JSON.stringify(requestBody));

    const summary = extractContent(response);
    logger.info('[summarizeText] Summary processed successfully.');

    return new LLMResponse(summary, 'completed', response.usage?.total_tokens);
}
