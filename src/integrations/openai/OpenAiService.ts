import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI, ClientOptions } from 'openai';
import { generateChatResponse } from './chat/generateChatResponse';
import { createChatCompletion } from './chat/createChatCompletion';
import { completeSentence } from './operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();

// Use openaiConfig directly from convict without casting to IConfig
const openaiConfig = configManager.getConfig('openai');
const llmConfig = configManager.getConfig('llm');

// Log the structure of openaiConfig for debugging purposes
debug('openaiConfig structure:', openaiConfig);

if (typeof openaiConfig?.get !== 'function') {
    throw new Error('Invalid OpenAI configuration: expected an object with a get method.');
}

/**
 * OpenAiService Class
 *
 * This service manages interactions with OpenAI's API, including creating chat completions
 * and listing available models. It is implemented as a singleton to ensure that only one
 * instance of the service is used throughout the application.
 *
 * Key Features:
 * - **Integration with ConfigurationManager**: Relies on the ConfigurationManager class to retrieve 
 *   dynamic configurations such as API keys and timeouts, ensuring flexibility and adaptability to 
 *   different environments and integration requirements.
 *
 * - **Singleton Pattern**: Ensures that only one instance of the OpenAiService exists, managing 
 *   the state and interactions with OpenAI's API.
 *
 * - **Dynamic Configuration Usage**: Supports the flexible loading and management of configurations 
 *   at runtime, allowing the service to adapt to various environments without requiring code changes.
 *
 * Usage:
 * - Use `createChatCompletion` to send chat completion requests.
 * - Use `generateChatResponse` for generating responses with history management.
 * - Use `listModels` to retrieve available models from OpenAI.
 */
export class OpenAiService {
    private static instance: OpenAiService; // Singleton instance
    public readonly openai: OpenAI; // Instance of the OpenAI API client, changed to public
    private busy: boolean = false;
    private readonly parallelExecution: boolean; // Configurable option for parallel execution
    private readonly finishReasonRetry: string; // Configurable finish reason for retry
    private readonly maxRetries: number; // Configurable maximum retries

    // Private constructor to enforce singleton pattern
    private constructor() {
        if (!openaiConfig) {
            throw new Error('OpenAI configuration not found. Please ensure the OpenAI config is loaded.');
        }

        const options: ClientOptions = {
            apiKey: openaiConfig?.get<string>('OPENAI_API_KEY')!,
            organization: openaiConfig?.get<string>('OPENAI_ORGANIZATION') || undefined,
            baseURL: openaiConfig?.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com',
            timeout: parseInt(openaiConfig?.get<string>('OPENAI_TIMEOUT') ?? '30000'),
        };

        this.openai = new OpenAI(options);
        // @ts-ignore: Suppressing deep type instantiation issues
        this.parallelExecution = Boolean(llmConfig?.get<boolean>('LLM_PARALLEL_EXECUTION')) || false;
        // Ensuring finishReasonRetry is a string
        this.finishReasonRetry = openaiConfig?.get<string>('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = parseInt(openaiConfig?.get<string>('OPENAI_MAX_RETRIES') ?? '3');

        debug('[DEBUG] OpenAiService initialized with API Key:', options.apiKey);
    }

    /**
     * Retrieves the singleton instance of OpenAiService.
     *
     * @returns {OpenAiService} The singleton instance of OpenAiService.
     */
    public static getInstance(): OpenAiService {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }

    /**
     * Checks if the service is currently busy.
     *
     * @returns {boolean} True if the service is busy, false otherwise.
     */
    public isBusy(): boolean {
        return this.busy;
    }

    /**
     * Sets the busy status of the service.
     *
     * @param {boolean} status - The busy status to set.
     */
    public setBusy(status: boolean): void {
        this.busy = status;
    }

    /**
     * Sends the chat completion request to OpenAI API and returns the response.
     *
     * @param historyMessages: IMessage[], systemMessageContent: string = openaiConfig?.get<string>('OPENAI_SYSTEM_PROMPT') || '', maxTokens: number = parseInt(openaiConfig?.get<string>('OPENAI_RESPONSE_MAX_TOKENS') || '150')
     *
     * @returns {Promise<OpenAI.Chat.ChatCompletion>} - The API response.
     */
    // @ts-ignore
    public async createChatCompletion(
        historyMessages: IMessage[],
        systemMessageContent: string = openaiConfig?.get<string>('OPENAI_SYSTEM_PROMPT') || '',
        maxTokens: number = parseInt(openaiConfig?.get<string>('OPENAI_RESPONSE_MAX_TOKENS') || '150')
    ): Promise<OpenAI.Chat.ChatCompletion> {
        try {
            const requestBody = createChatCompletion(historyMessages, systemMessageContent, maxTokens);
            // @ts-ignore
            const response = await this.openai.chat.completions.create(requestBody) as unknown as OpenAI.Chat.ChatCompletion;
            return response;
        } catch (error: any) {
            debug('createChatCompletion: Error occurred:', error);
            throw new Error(`Failed to create chat completion: ${error.message}`);
        }
    }

    /**
     * Generates a chat response using the OpenAI API.
     * This method wraps the process of building a request body and sending it to the API,
     * ensuring that the service is not busy before making the request.
     *
     * @param message: string, historyMessages: IMessage[]
     * @returns {Promise<string | null>} - The OpenAI API's response, or null if an error occurs.
     */
    public async generateChatResponse(message: string, historyMessages: IMessage[]): Promise<string | null> {
        return generateChatResponse(this, message, historyMessages, {
            parallelExecution: this.parallelExecution,
            maxRetries: this.maxRetries,
            finishReasonRetry: this.finishReasonRetry,
            isBusy: this.isBusy.bind(this),
            setBusy: this.setBusy.bind(this),
        });
    }

    /**
     * Lists all available models from OpenAI.
     *
     * @returns {Promise<any>} - The list of available models.
     */
    public async listModels(): Promise<any> {
        try {
            const response = await this.openai.models.list();
            debug('Available models:', response.data);
            return response.data;
        } catch (error: any) {
            debug('Error listing models:', error);
            throw new Error(`Failed to list models: ${error.message}`);
        }
    }
}

export default OpenAiService.getInstance();
