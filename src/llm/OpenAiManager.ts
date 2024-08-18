import logger from './logger';
import constants from '../config/configurationManager';
import LLMResponse from '../interfaces/LLMResponse';
import { handleError } from '../utils/commonUtils';
import { extractContent } from './openAiUtils';

export class OpenAiManager {
    constructor(private openai: any) {}

    async makeOpenAiRequest(requestBody: any): Promise<any> {
        if (typeof this.openai !== 'object' || this.openai === null) {
            logger.error('[makeOpenAiRequest] Invalid OpenAI client instance passed.');
            throw new TypeError('Invalid OpenAI client instance passed.');
        }

        if (typeof requestBody !== 'object' || requestBody === null) {
            logger.error('[makeOpenAiRequest] Invalid request body passed.');
            throw new TypeError('Invalid request body passed.');
        }

        logger.debug('[makeOpenAiRequest] Sending request with body: ' + JSON.stringify(requestBody));

        try {
            const requestOptions: any = {};
            if (constants.LLM_TIMEOUT) {
                requestOptions.timeout = constants.LLM_TIMEOUT * 1000;
            }

            let response: any = null;
            if (requestBody.prompt) {
                response = await this.openai.completions.create(requestBody, requestOptions);
            } else {
                response = await this.openai.chat.completions.create(requestBody, requestOptions);
            }

            if (!response || !response.choices || response.choices.length === 0) {
                logger.error('[makeOpenAiRequest] No valid response or choices returned from the API.');
                throw new Error('No valid response or choices returned from the API.');
            }

            logger.debug('[makeOpenAiRequest] Received response: ' + JSON.stringify(response));

            return response;
        } catch (error: any) {
            logger.error('[makeOpenAiRequest] Failed to make OpenAI request: ' + error.message, error);
            throw new Error('OpenAI API request failed: ' + error.message);
        }
    }

    async completeSentence(content: string): Promise<string> {
        if (typeof content !== 'string') {
            logger.error('[completeSentence] The content must be a string.');
            throw new TypeError('Expected content to be a string, received type ' + typeof content);
        }

        logger.debug('[completeSentence] Content type: ' + typeof content + ', content value: ' + content);

        if (/[.?!]\s*$/.test(content)) {
            logger.debug('[completeSentence] Content already ends with a punctuation mark.');
            return content;  // Return as no completion needed
        }

        const promptText = content.trim() + ' ';
        const continuationBody = {
            model: constants.LLM_MODEL,
            prompt: promptText,
            max_tokens: 50,
            temperature: 0.5
        };

        logger.debug('[completeSentence] Sending continuation request: ' + JSON.stringify(continuationBody));

        try {
            const continuationResponse = await this.openai.completions.create(continuationBody);
            if (!continuationResponse || !continuationResponse.choices || continuationResponse.choices.length === 0) {
                logger.error('[completeSentence] No valid choices returned from the API.');
                throw new Error('Failed to retrieve valid choices from the API.');
            }

            const continuationText = continuationResponse.choices[0].text.trim();
            if (continuationText) {
                logger.debug('[completeSentence] Received continuation text: ' + continuationText);
                content += continuationText;
            } else {
                logger.warn('[completeSentence] Received empty continuation text.');
            }
        } catch (error: any) {
            logger.error('[completeSentence] Error completing sentence:', error);
            throw error;
        }

        return content;
    }

    async summarizeText(
        userMessage: string,
        systemMessageContent: string = constants.LLM_SUMMARY_SYSTEM_PROMPT,
        maxTokens: number = constants.LLM_SUMMARY_MAX_TOKENS
    ): Promise<LLMResponse> {
        if (!constants.LLM_SUPPORTS_COMPLETIONS) {
            logger.warn('[summarizeText] Summarization requires completions support which is disabled.');
            return new LLMResponse('', 'completions_disabled');
        }

        const prompt = systemMessageContent + '\nUser: ' + userMessage + '\nAssistant:';
        const requestBody = {
            model: constants.LLM_MODEL,
            prompt: prompt,
            max_tokens: maxTokens,
            temperature: 0.5
        };

        logger.debug('[summarizeText] Sending summarization request with prompt: ' + prompt);

        try {
            const response = await this.makeOpenAiRequest(requestBody);
            const summary = extractContent(response.choices[0]);
            logger.info('[summarizeText] Summary processed successfully.');

            return new LLMResponse(summary, 'completed', response.usage.total_tokens);
        } catch (error: any) {
            handleError(error, '[summarizeText] Error during text summarization');
            return new LLMResponse('', 'error', 0);
        }
    }
}
