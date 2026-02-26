import { OpenAI } from 'openai';
import type { IMessage } from '@src/message/interfaces/IMessage';
import type { OpenAIModelsListResponse, OpenHivemindChatResponse } from '@src/types/openai';
export declare class OpenAiService {
    private static instance;
    readonly openai: OpenAI;
    private busy;
    private readonly parallelExecution;
    private readonly finishReasonRetry;
    private readonly maxRetries;
    private readonly requestTimeout;
    /**
     * Private constructor to initialize the OpenAI client and configuration.
     */
    private constructor();
    /**
     * Singleton pattern to get the instance of OpenAiService.
     */
    static getInstance(): OpenAiService;
    /**
     * Checks whether the service is currently busy processing requests.
     */
    isBusy(): boolean;
    /**
     * Sets the busy status of the service.
     * @param status - True to set the service as busy, false to set it as idle.
     */
    setBusy(status: boolean): void;
    /**
     * Generates a chat completion from OpenAI based on the user's message and history.
     * Instead of returning just a string, this method returns an object with two properties:
     *  - text: the generated response content.
     *  - context_variables: an object that includes active_agent_name (if available).
     *
     * @param message - The user's input message.
     * @param historyMessages - Previous chat messages.
     * @param systemMessageContent - A system-level message to initialize the chat context.
     * @param maxTokens - Maximum number of tokens for the response (default: 150).
     * @param temperature - Controls randomness in the response (default: 0.7).
     * @returns {Promise<OpenHivemindChatResponse>} The generated chat completion response object.
     */
    generateChatCompletion(message: string, historyMessages: IMessage[], systemMessageContent?: string, maxTokens?: number, temperature?: number): Promise<OpenHivemindChatResponse>;
    /**
     * Generates a chat response using OpenAI, passthrough to generateChatCompletion.
     */
    generateChatResponse(message: string, historyMessages: IMessage[], systemMessageContent?: string, maxTokens?: number, temperature?: number): Promise<OpenHivemindChatResponse>;
    /**
     * Lists available OpenAI models by invoking the OpenAI API.
     */
    listModels(): Promise<OpenAIModelsListResponse>;
    /**
     * Retry with exponential backoff and jitter for rate limits and transient errors
     */
    private retryWithBackoff;
    /**
     * Classify errors as rate-limit, transient, or fatal
     */
    private classifyError;
    /**
     * Redacts the OpenAI API key for logging purposes.
     */
    private redactApiKeyForLogging;
}
declare const _default: OpenAiService;
export default _default;
//# sourceMappingURL=OpenAiService.d.ts.map