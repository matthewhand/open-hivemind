import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';
import { OpenAI, ClientOptions } from 'openai';
import { createChatCompletion } from './chat/createChatCompletion';
import { completeSentence } from './operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');
const configManager = ConfigurationManager.getInstance();

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
        const openaiConfig = configManager.getConfig('openai');

        if (!openaiConfig) {
            throw new Error('OpenAI configuration not found. Please ensure the OpenAI config is loaded.');
        }

        const options: ClientOptions = {
            apiKey: openaiConfig.get('OPENAI_API_KEY'),
            organization: openaiConfig.get('OPENAI_ORGANIZATION') || undefined,
            baseURL: openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com',
            timeout: openaiConfig.get('OPENAI_TIMEOUT') || 30000,
        };

        this.openai = new OpenAI(options);
        this.parallelExecution = openaiConfig.get('LLM_PARALLEL_EXECUTION') || false;
        this.finishReasonRetry = openaiConfig.get('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = openaiConfig.get('OPENAI_MAX_RETRIES') || 3;

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
     * @param historyMessages - Array of IMessage objects representing the conversation history.
     * @param systemMessageContent - System message to provide context for the chat.
     * @param maxTokens - Maximum tokens for the AI response.
     * @returns {Promise<OpenAI.Chat.ChatCompletion>} - The API response.
     */
    public async createChatCompletion(
        historyMessages: IMessage[],
        systemMessageContent: string = configManager.getConfig("openai")?.get('OPENAI_SYSTEM_PROMPT') || '',
        maxTokens: number = configManager.getConfig("openai")?.get('OPENAI_RESPONSE_MAX_TOKENS') || 150
    ): Promise<OpenAI.Chat.ChatCompletion> {
        try {
            // Create the request body using the helper function
            const requestBody = createChatCompletion(historyMessages, systemMessageContent, maxTokens);

            // Send the request to OpenAI
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
     * @param message - The user message that requires a response.
     * @param historyMessages - The array of previous conversation messages for context.
     * @returns {Promise<string | null>} - The OpenAI API's response, or null if an error occurs.
     */
    public async generateChatResponse(message: string, historyMessages: any[]): Promise<string | null> {
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

            // Retry logic based on finish reason
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
}
