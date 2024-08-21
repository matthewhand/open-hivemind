import config from 'config'; // Importing the config module to access JSON configuration
import logger from '@utils/logger';
import LLMResponse from '@src/llm/LLMResponse';
import { handleError } from '../utils/commonUtils';
import { extractContent } from './openAiUtils';

export class OpenAiManager {
    // Constructor to inject the OpenAI client instance.
    constructor(private openai: any) {}

    // Method to make a request to the OpenAI API.
    async makeOpenAiRequest(requestBody: any): Promise<any> {
        // Guard clauses to ensure valid OpenAI client and request body.
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
            const timeout = config.get<number>('llm.openai.timeout');
            if (timeout) {
                requestOptions.timeout = timeout * 1000; // Convert timeout to milliseconds
                logger.debug(`[makeOpenAiRequest] Request timeout set to ${requestOptions.timeout} ms`);
            }

            // Determine if the request is for a prompt completion or a chat-based completion.
            let response: any = null;
            if (requestBody.prompt) {
                response = await this.openai.completions.create(requestBody, requestOptions);
            } else {
                response = await this.openai.chat.completions.create(requestBody, requestOptions);
            }

            // Guard to ensure a valid response with choices.
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

    // Method to complete a sentence using the OpenAI API.
    async completeSentence(content: string): Promise<string> {
        // Guard clause to ensure content is a string.
        if (typeof content !== 'string') {
            logger.error('[completeSentence] The content must be a string.');
            throw new TypeError('Expected content to be a string, received type ' + typeof content);
        }

        logger.debug('[completeSentence] Content type: ' + typeof content + ', content value: ' + content);

        // Check if the content already ends with a punctuation mark.
        if (/[.?!]\\s*$/.test(content)) {
            logger.debug('[completeSentence] Content already ends with a punctuation mark.');
            return content;  // Return as no completion needed
        }

        const promptText = content.trim() + ' ';
        const continuationBody = {
            model: config.get<string>('llm.openai.completions.model'),
            prompt: promptText,
            max_tokens: config.get<number>('llm.openai.completions.maxTokens'),
            temperature: config.get<number>('llm.openai.completions.temperature')
        };

        logger.debug('[completeSentence] Sending continuation request: ' + JSON.stringify(continuationBody));

        try {
            const continuationResponse = await this.openai.completions.create(continuationBody);
            
            // Guard to ensure a valid response with choices.
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

    // Method to summarize text using the OpenAI API.
    async summarizeText(
        userMessage: string,
        systemMessageContent: string = config.get<string>('llm.openai.chatCompletions.systemMessage'),
        maxTokens: number = config.get<number>('llm.openai.chatCompletions.maxTokens')
    ): Promise<LLMResponse> {
        // Guard to ensure summarization is supported.
        const supportsCompletions = config.get<boolean>('llm.supportsCompletions');
        if (!supportsCompletions) {
            logger.warn('[summarizeText] Summarization requires completions support which is disabled.');
            return new LLMResponse('', 'completions_disabled');
        }

        const prompt = systemMessageContent + '\nUser: ' + userMessage + '\nAssistant:';
        const requestBody = {
            model: config.get<string>('llm.openai.chatCompletions.model'),
            prompt: prompt,
            max_tokens: maxTokens,
            temperature: config.get<number>('llm.openai.chatCompletions.temperature')
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
