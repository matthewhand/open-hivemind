import Debug from 'debug';
import { OpenAI, ClientOptions } from 'openai';
import ConfigurationManager from '@config/ConfigurationManager';
import { generateChatResponse } from './chat/generateChatResponse';
import { createChatCompletion } from './chat/createChatCompletion';
import { listModels } from './operations/listModels';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();

// Attempt to retrieve the OpenAI configuration
debug('Attempting to retrieve OpenAI configuration...');
const openaiConfig = openaiConfig;
const llmConfig = llmConfig;

// Log the retrieved configuration objects
debug('Retrieved openaiConfig:', openaiConfig);
debug('Retrieved llmConfig:', llmConfig);

if (!openaiConfig || typeof openaiConfig.get !== 'function') {
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
 * - Singleton pattern for centralized management
 * - Handles API requests for chat completions
 * - Manages service state, including busy status
 * - Supports generating chat responses with history management
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
            apiKey: openaiConfig.get<string>('OPENAI_API_KEY')!,
            organization: openaiConfig.get<string>('OPENAI_ORGANIZATION') || undefined,
            baseURL: openaiConfig.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com',
            timeout: parseInt(openaiConfig.get<string>('OPENAI_TIMEOUT') ?? '30000'),
        };

        this.openai = new OpenAI(options);
        // @ts-ignore: Suppressing deep type instantiation issues
        this.parallelExecution = Boolean(llmConfig?.get<boolean>('LLM_PARALLEL_EXECUTION')) || false;
        // Ensuring finishReasonRetry is a string
        this.finishReasonRetry = openaiConfig.get<string>('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = parseInt(openaiConfig.get<string>('OPENAI_MAX_RETRIES') ?? '3');

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
    public async createChatCompletion(
        historyMessages: IMessage[],
        systemMessageContent: string = openaiConfig?.get<string>('OPENAI_SYSTEM_PROMPT') || '',
        maxTokens: number = parseInt(openaiConfig?.get<string>('OPENAI_RESPONSE_MAX_TOKENS') || '150')
    ): Promise<OpenAI.Chat.ChatCompletion> {
        return createChatCompletion(this.openai, historyMessages, systemMessageContent, maxTokens);
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
        return listModels(this.openai);
    }
}

export default OpenAiService.getInstance();
