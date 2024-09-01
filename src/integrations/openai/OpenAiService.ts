import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI, ClientOptions } from 'openai';
import { createChatCompletion } from './chat/createChatCompletion';
import { completeSentence } from './operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();
const openaiConfig = configManager.getConfig('openai');
const llmConfig = configManager.getConfig('llm');

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
    private readonly openai: OpenAI; // Instance of the OpenAI API client
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
            timeout: openaiConfig?.get<number>('OPENAI_TIMEOUT') || 30000,
        };

        // @ts-ignore: Type instantiation is excessively deep and possibly infinite
        this.openai = new OpenAI(options);
        this.parallelExecution = llmConfig?.get<boolean>('LLM_PARALLEL_EXECUTION') || false;
        this.finishReasonRetry = openaiConfig?.get<string>('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = openaiConfig?.get<number>('OPENAI_MAX_RETRIES') || 3;

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
     * @param historyMessages: IMessage[], systemMessageContent: string = openaiConfig?.get<string>('OPENAI_SYSTEM_PROMPT') || '', maxTokens: number = openaiConfig?.get<number>('OPENAI_RESPONSE_MAX_TOKENS') || 150
     * 
     * @returns {Promise<OpenAI.Chat.ChatCompletion>} - The API response.
     */
    public async createChatCompletion(
        historyMessages: IMessage[],
        systemMessageContent: string = openaiConfig?.get<string>('OPENAI_SYSTEM_PROMPT') || '',
        maxTokens: number = openaiConfig?.get<number>('OPENAI_RESPONSE_MAX_TOKENS') || 150
    ): Promise<OpenAI.Chat.ChatCompletion> {
        try {
            const requestBody = createChatCompletion(historyMessages, systemMessageContent, maxTokens);
            const response = await this.openai.chat.completions.create(requestBody) as OpenAI.Chat.ChatCompletion;
            return response;
        } catch (error: any) {
            debug('createChatCompletion: Error occurred:', error);
            throw error;
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
        if (!this.openai.apiKey) {
            debug('generateChatResponse: API key is missing');
            return null;
        }

        debug('generateChatResponse: Building request body');
        const requestBody = await createChatCompletion([
            ...historyMessages,
            { role: 'user', content: message },
        ]);

        if (!this.parallelExecution && this.isBusy()) {
            debug('generateChatResponse: Service is busy');
            return null;
        }

        try {
            if (!this.parallelExecution) {
                this.setBusy(true);
            }

            debug('generateChatResponse: Sending request to OpenAI API');
            const response = await this.createChatCompletion(historyMessages);

            let finishReason = response.choices[0].finish_reason;
            let content = response.choices[0].message.content;

            for (let attempt = 1; attempt <= this.maxRetries && finishReason === this.finishReasonRetry; attempt++) {
                debug(`generateChatResponse: Retrying due to ${finishReason} (attempt ${attempt})`);
                content = await completeSentence(this, content ?? '');
                finishReason = finishReason === 'stop' ? 'stop' : finishReason;
            }

            return content;
        } catch (error: any) {
            debug('generateChatResponse: Error occurred:', error);
            return null;
        } finally {
            if (!this.parallelExecution) {
                this.setBusy(false);
                debug('generateChatResponse: Service busy status reset');
            }
        }
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
