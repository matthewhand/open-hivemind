import Debug from 'debug';
import ConfigurationManager from '@common/config/ConfigurationManager';
import { OpenAIApi, Configuration } from 'openai';
import { createChatCompletionRequestBody } from './operations/createChatCompletionRequestBody';

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
    private readonly openai: OpenAIApi; // Instance of the OpenAI API client
    private busy: boolean = false;
    private readonly parallelExecution: boolean; // New config option

    // Private constructor to enforce singleton pattern
    private constructor() {
        const configuration = new Configuration({
            apiKey: configManager.OPENAI_API_KEY,
            organization: configManager.OPENAI_ORGANIZATION,
        });

        this.openai = new OpenAIApi(configuration); // Initialize OpenAI client with configuration
        this.parallelExecution = configManager.get('llm.openai.chatCompletions.parallel_execution', false); // Set parallelExecution from config
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
     * ensuring that the service is not busy before making the request if parallel execution is disabled.
     *
     * @param message - The user message that requires a response.
     * @param historyMessages - The array of previous conversation messages for context.
     * @returns {Promise<any>} - The OpenAI API's response, or null if an error occurs.
     */
    public async generateChatResponse(message: string, historyMessages: any[]): Promise<any> {
        if (!this.openai.configuration.apiKey) {
            debug('generateChatResponse: API key is missing');
            return null;
        }

        if (!this.parallelExecution && this.isBusy()) {
            debug('generateChatResponse: Service is busy');
            return null;
        }

        try {
            if (!this.parallelExecution) {
                this.setBusy(true); // Set service to busy to prevent other requests
            }
            debug('generateChatResponse: Building request body');

            // Build the request body including the conversation history and the new message
            const requestBody = await createChatCompletionRequestBody([
                ...historyMessages,
                { role: 'user', content: message },
            ]);

            debug('generateChatResponse: Sending request to OpenAI API');

            // Send the request using the OpenAI SDK
            const response = await this.openai.createChatCompletion(requestBody);

            debug('generateChatResponse: Received response from OpenAI API');
            return response.data;
        } catch (error: any) {
            debug('generateChatResponse: Error occurred:', error);
            return null; // Return null in case of an error
        } finally {
            if (!this.parallelExecution) {
                this.setBusy(false); // Reset the busy status
                debug('generateChatResponse: Service busy status reset');
            }
        }
    }
}
