import Debug from "debug";
const debug = Debug("app");

import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/operations/extractContent';
import { sendCompletionsRequest } from './sendCompletionsRequest';

import { OpenAiService } from './OpenAiService';
import constants from '@config/ConfigurationManager';
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
