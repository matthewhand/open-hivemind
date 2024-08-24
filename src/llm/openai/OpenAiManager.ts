import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';
import logger from '@src/utils/logger';
import { LLMInterface } from '@src/llm/LLMInterface';
import LLMResponse from '@src/llm/LLMResponse';
import { extractContent } from '@src/llm/openai/utils/extractContent';
import { completeSentence } from '@src/llm/openai/utils/completeSentence';
import { needsCompletion } from '@src/llm/openai/utils/needsCompletion';

interface OpenAIRequestBody {
    model: string;
    messages: Array<{ role: string; content: string }>;
}

class OpenAiManager extends LLMInterface {
    private static instance: OpenAiManager;
    private openai: OpenAI;
    private busy: boolean;

    private constructor() {
        super();
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

    public async buildRequestBody(historyMessages: any[]): Promise<OpenAIRequestBody> {
        return {
            model: constants.LLM_MODEL,
            messages: historyMessages.map((msg) => ({ role: msg.role, content: msg.content }))
        };
    }

    public async sendRequest(message: any, history?: any[]): Promise<LLMResponse> {
        if (this.isBusy()) {
            logger.warn('[OpenAiManager.sendRequest] The manager is currently busy with another request.');
            return new LLMResponse('', 'busy');
        }

        this.setBusy(true);
        logger.debug('[OpenAiManager.sendRequest] Sending request to OpenAI');

        try {
            const requestBody = await this.buildRequestBody(history || []);
            const response = await this.openai.chat.completions.create(requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage ? response.usage.total_tokens : 0;
            let finishReason = response.choices[0].finish_reason;
            let maxTokensReached = tokensUsed >= constants.LLM_RESPONSE_MAX_TOKENS;

            if (
                constants.LLM_SUPPORTS_COMPLETIONS &&
                needsCompletion(maxTokensReached, finishReason, content)
            ) {
                logger.info('[OpenAiManager.sendRequest] Completing the response due to reaching the token limit or incomplete sentence.');
                content = await completeSentence(this.openai, content, constants);
            }

            return new LLMResponse(content, finishReason, tokensUsed);
        } catch (error: any) {
            logger.error('[OpenAiManager.sendRequest] Error during OpenAI API request: ' + error.message);
            return new LLMResponse('', 'error');
        } finally {
            this.setBusy(false);
            logger.debug('[OpenAiManager.sendRequest] Set busy to false after processing the request.');
        }
    }
}

export default OpenAiManager;
