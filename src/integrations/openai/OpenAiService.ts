import Debug from 'debug';
import axios from 'axios';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:OpenAiService');
const configManager = new ConfigurationManager();

/**
 * OpenAI Service handles interaction with OpenAI's API.
 * This service provides methods to create chat completions and other related functionalities.
 */
export class OpenAiService {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly timeout: number;
    private readonly organization?: string;
    private readonly model: string;
    private busy: boolean = false;

    constructor() {
        this.apiKey = configManager.OPENAI_API_KEY;
        this.baseUrl = configManager.OPENAI_BASE_URL;
        this.timeout = configManager.OPENAI_TIMEOUT;
        this.organization = configManager.OPENAI_ORGANIZATION;
        this.model = configManager.OPENAI_MODEL;
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
     * Returns the OpenAI client instance.
     * @returns {OpenAiService} The OpenAI client instance.
     */
    public getClient(): OpenAiService {
        return this;
    }
}
