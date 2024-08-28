import Debug from 'debug';
import axios from 'axios';
import ConfigurationManager from '@common/config/ConfigurationManager';
import { sendChatCompletionsRequest } from './operations/sendChatCompletionsRequest';
import { buildChatCompletionRequestBody } from './buildChatCompletionRequestBody';

const debug = Debug('app:OpenAiService');
const configManager = new ConfigurationManager();

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
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly organization?: string;
    private readonly model: string;
    private busy: boolean = false;

    // Private constructor to enforce singleton pattern
    private constructor() {
        this.apiKey = configManager.OPENAI_API_KEY;
        this.baseUrl = configManager.OPENAI_BASE_URL;
        this.timeout = configManager.OPENAI_TIMEOUT;
        this.organization = configManager.OPENAI_ORGANIZATION;
        this.model = configManager.OPENAI_MODEL;
    }

    /**
     * Static method to get the singleton instance of OpenAiService.
     * @returns {OpenAiService} The singleton instance.
     */
    public static getInstance(): OpenAiService {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }

    /**
     * Creates a chat completion request to OpenAI API.
     * @param message - The message to send to OpenAI's model.
     * @returns The response data from OpenAI.
     */
    public async createChatCompletion(message: string): Promise<any> {
        if (!this.apiKey) {
            debug('API key is missing');
            return null;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/v1/chat/completions`, {
                model: this.model,
                messages: [{ role: 'user', content: message }],
                max_tokens: configManager.OPENAI_MAX_TOKENS,
                temperature: configManager.OPENAI_TEMPERATURE,
                top_p: configManager.LLM_TOP_P,
                frequency_penalty: configManager.OPENAI_FREQUENCY_PENALTY,
                presence_penalty: configManager.OPENAI_PRESENCE_PENALTY,
                stop: configManager.LLM_STOP
            }, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    ...(this.organization && { 'OpenAI-Organization': this.organization })
                },
                timeout: this.timeout
            });

            return response.data;
        } catch (error: any) {
            debug('Error creating chat completion:', error);
            return null;
        }
    }

    /**
     * Retrieves the list of models available for the API key.
     * @returns The list of available models.
     */
    public async listModels(): Promise<any> {
        try {
            const response = await axios.get(`${this.baseUrl}/v1/models`, {
                headers: { Authorization: `Bearer ${this.apiKey}` }
            });

            return response.data;
        } catch (error: any) {
            debug('Error listing models:', error);
            return null;
        }
    }

    /**
     * Checks if the service is currently busy.
     * @returns {boolean} True if the service is busy, false otherwise.
     */
    public isBusy(): boolean {
        return this.busy;
    }

    /**
     * Sets the busy status of the service.
     * @param status - The busy status to set.
     */
    public setBusy(status: boolean): void {
        this.busy = status;
    }

    /**
     * Generates a chat response using the OpenAI API.
     * This method wraps the process of building a request body and sending it to the API,
     * ensuring that the service is not busy before making the request.
     *
     * @param message - The user message that requires a response.
     * @param historyMessages - The array of previous conversation messages for context.
     * @returns {Promise<any>} - The OpenAI API's response, or null if an error occurs.
     */
    public async generateChatResponse(message: string, historyMessages: any[]): Promise<any> {
        if (!this.apiKey) {
            debug('generateChatResponse: API key is missing');
            return null;
        }

        if (this.isBusy()) {
            debug('generateChatResponse: Service is busy');
            return null;
        }

        try {
            this.setBusy(true); // Set service to busy to prevent other requests
            debug('generateChatResponse: Building request body');

            // Build the request body including the conversation history and the new message
            const requestBody = await buildChatCompletionRequestBody([
                ...historyMessages,
                { role: 'user', content: message },
            ]);

            debug('generateChatResponse: Sending request to OpenAI API');
            
            // Send the request using the helper function
            const response = await sendChatCompletionsRequest(requestBody);

            debug('generateChatResponse: Received response from OpenAI API');
            return response;
        } catch (error: any) {
            debug('generateChatResponse: Error occurred:', error);
            return null; // Return null in case of an error
        } finally {
            this.setBusy(false); // Reset the busy status
            debug('generateChatResponse: Service busy status reset');
        }
    }
}
