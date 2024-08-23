import OpenAI from 'openai';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';
import { IMessage } from '../../message/types/IMessage';
import { LLMResponse } from '../../llm/LLMResponse';
import { extractContent } from './utils/extractContent';
import { makeOpenAiRequest } from './utils/makeOpenAiRequest';
import { completeSentence } from './utils/completeSentence';
import { needsCompletion } from './utils/needsCompletion';
import { getEmoji } from '@src/utils/getEmoji';
import { handleError, redactSensitiveInfo } from '@src/utils/commonUtils';

/**
 * Manages interactions with the OpenAI API, ensuring efficient and correct request handling.
 * This manager maintains a single instance throughout the application to manage state and API interactions.
 */
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

    public buildRequestBody(
        historyMessages: IMessage[] = [],
        systemMessageContent: string = constants.LLM_SYSTEM_PROMPT,
        maxTokens: number = constants.LLM_RESPONSE_MAX_TOKENS
    ): Record<string, any> {
        let messages: Array<{ role: string; content: string; name?: string }> = [
            { role: 'system', content: systemMessageContent },
        ];

        const supportNameField = process.env.LLM_SUPPORT_NAME_FIELD !== 'false';

        if (
            historyMessages.length > 0 &&
            historyMessages[0].isFromBot() &&
            historyMessages[0].role !== 'user'
        ) {
            messages.push({ role: 'user', content: '...' });
        }

        historyMessages.forEach((message) => {
            const currentRole = message.isFromBot() ? 'assistant' : 'user';
            const authorName = message.getAuthorId();

            if (supportNameField) {
                if (
                    messages[messages.length - 1].role !== currentRole ||
                    messages[messages.length - 1].name !== authorName
                ) {
                    messages.push({ role: currentRole, content: message.getText(), name: authorName });
                } else {
                    messages[messages.length - 1].content += ' ' + message.getText();
                }
            } else {
                if (messages[messages.length - 1].role !== currentRole) {
                    messages.push({ role: currentRole, content: message.getText() });
                } else {
                    messages[messages.length - 1].content += ' ' + message.getText();
                }
            }
        });

        if (messages[messages.length - 1].role !== 'user') {
            messages.push({ role: 'user', content: getEmoji() });
        }

        const requestBody: Record<string, any> = {
            model: constants.LLM_MODEL,
            messages: messages,
            max_tokens: maxTokens,
            temperature: constants.LLM_TEMPERATURE,
        };

        const llmStop = constants.LLM_STOP.length > 0 ? constants.LLM_STOP : null;

        if (llmStop) {
            requestBody.stop = llmStop;
        }

        return requestBody;
    }

    public async sendRequest(requestBody: Record<string, any>): Promise<LLMResponse> {
        if (this.busy) {
            logger.warn('[OpenAiManager.sendRequest] The manager is currently busy with another request.');
            return new LLMResponse('', 'busy');
        }

        this.busy = true;
        logger.debug('[OpenAiManager.sendRequest] Sending request to OpenAI');
        logger.debug('[OpenAiManager.sendRequest] Request body: ' + JSON.stringify(requestBody, redactSensitiveInfo, 2));

        try {
            const response = await makeOpenAiRequest(this.openai, requestBody);
            let content = extractContent(response.choices[0]);
            let tokensUsed = response.usage.total_tokens;
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
            handleError(error);
            return new LLMResponse('', 'error');
        } finally {
            this.busy = false;
            logger.debug('[OpenAiManager.sendRequest] Set busy to false after processing the request.');
        }
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public requiresHistory(): boolean {
        return true;
    }
}

export default OpenAiManager;
