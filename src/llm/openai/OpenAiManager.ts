import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';
import logger from '@src/utils/logger';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { completeSentence } from '@src/llm/openai/utils/completeSentence';
import { needsCompletion } from '@src/llm/openai/utils/needsCompletion';

class OpenAiManager {
    private static instance: OpenAiManager;
    private openai: OpenAI;
    private busy: boolean;

    private constructor() {
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL,
        });
        this.busy = false;
    }

    public static getInstance(): OpenAiManager {
        if (!OpenAiManager.instance) {
            OpenAiManager.instance = new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    public getClient(): OpenAI {
        return this.openai;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public setBusy(isBusy: boolean): void {
        this.busy = isBusy;
    }

    private isValidRole(role: string): boolean {
        return ['user', 'system', 'assistant', 'function'].includes(role);
    }

    public async buildCompletionsRequest(prompt: string): Promise<object> {
        return {
            model: constants.LLM_MODEL,
            prompt,
            max_tokens: constants.LLM_RESPONSE_MAX_TOKENS,
            temperature: constants.LLM_TEMPERATURE,
            user: constants.INCLUDE_USERNAME_IN_COMPLETION ? 'assistant' : undefined,
        };
    }

    public async buildChatCompletionsRequest(historyMessages: any[]): Promise<object> {
        return {
            model: constants.LLM_MODEL,
            messages: historyMessages.map((msg) => ({
                role: this.isValidRole(msg.role) ? msg.role : 'user',
                content: msg.content,
                name: constants.INCLUDE_USERNAME_IN_CHAT_COMPLETION ? 'assistant' : undefined,
            }))
        };
    }

    // New Method: buildRequestBody
    public async buildRequestBody(history: any[], prompt: string): Promise<object> {
        if (!Array.isArray(history)) {
            throw new Error('History must be an array');
        }

        const messages = history.map((msg) => ({
            role: this.isValidRole(msg.role) ? msg.role : 'user',
            content: msg.content,
        }));

        messages.push({ role: 'user', content: prompt });

        return {
            model: constants.LLM_MODEL,
            messages,
            max_tokens: constants.LLM_RESPONSE_MAX_TOKENS,
            temperature: constants.LLM_TEMPERATURE,
        };
    }

    public async sendCompletionsRequest(message: string, dryRun: boolean = false): Promise<LLMResponse> {
        if (this.isBusy()) {
            logger.warn('[OpenAiManager.sendCompletionsRequest] The manager is currently busy with another request.');
            return new LLMResponse('', 'busy');
        }

        this.setBusy(true);
        logger.debug('[OpenAiManager.sendCompletionsRequest] Sending request to OpenAI');

        try {
            const requestBody = await this.buildCompletionsRequest(message);

            if (dryRun) {
                logger.debug('[OpenAiManager.sendCompletionsRequest] Dry run mode - returning request body only');
                return new LLMResponse(JSON.stringify(requestBody), 'dry-run');
            }

            const response = await this.openai.completions.create(requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage ? response.usage.total_tokens : 0;
            let finishReason = response.choices[0].finish_reason;
            let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;

            if (
                constants.LLM_SUPPORTS_COMPLETIONS &&
                needsCompletion(maxTokensReached, finishReason, content)
            ) {
                logger.info('[OpenAiManager.sendCompletionsRequest] Completing the response due to reaching the token limit or incomplete sentence.');
                content = await completeSentence(this.openai, content, constants);
            }

            return new LLMResponse(content, finishReason, tokensUsed);
        } catch (error: any) {
            logger.error('[OpenAiManager.sendCompletionsRequest] Error during OpenAI API request: ' + error.message);
            return new LLMResponse('', 'error');
        } finally {
            this.setBusy(false);
            logger.debug('[OpenAiManager.sendCompletionsRequest] Set busy to false after processing the request.');
        }
    }

    public async sendChatCompletionsRequest(historyMessages: any[], dryRun: boolean = false): Promise<LLMResponse> {
        if (this.isBusy()) {
            logger.warn('[OpenAiManager.sendChatCompletionsRequest] The manager is currently busy with another request.');
            return new LLMResponse('', 'busy');
        }

        this.setBusy(true);
        logger.debug('[OpenAiManager.sendChatCompletionsRequest] Sending request to OpenAI');

        try {
            const requestBody = await this.buildChatCompletionsRequest(historyMessages);

            if (dryRun) {
                logger.debug('[OpenAiManager.sendChatCompletionsRequest] Dry run mode - returning request body only');
                return new LLMResponse(JSON.stringify(requestBody), 'dry-run');
            }

            const response = await this.openai.chat.completions.create(requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage ? response.usage.total_tokens : 0;
            let finishReason = response.choices[0].finish_reason;
            let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;

            if (
                constants.LLM_SUPPORTS_COMPLETIONS &&
                needsCompletion(maxTokensReached, finishReason, content)
            ) {
                logger.info('[OpenAiManager.sendChatCompletionsRequest] Completing the response due to reaching the token limit or incomplete sentence.');
                content = await completeSentence(this.openai, content, constants);
            }

            return new LLMResponse(content, finishReason, tokensUsed);
        } catch (error: any) {
            logger.error('[OpenAiManager.sendChatCompletionsRequest] Error during OpenAI API request: ' + error.message);
            return new LLMResponse('', 'error');
        } finally {
            this.setBusy(false);
            logger.debug('[OpenAiManager.sendChatCompletionsRequest] Set busy to false after processing the request.');
        }
    }

    public async summarizeText(
        userMessage: string,
        systemMessageContent: string = constants.LLM_SYSTEM_PROMPT,
        maxTokens: number = constants.LLM_RESPONSE_MAX_TOKENS
    ): Promise<LLMResponse> {
        const prompt = `${systemMessageContent}\nUser: ${userMessage}\nAssistant:`;
        const requestBody = await this.buildCompletionsRequest(prompt);
        const response = await this.sendCompletionsRequest(JSON.stringify(requestBody));

        const summary = extractContent(response);
        logger.info('[OpenAiManager.summarizeText] Summary processed successfully.');

        return new LLMResponse(summary, 'completed', response.usage?.total_tokens);
    }
}

export default OpenAiManager;
