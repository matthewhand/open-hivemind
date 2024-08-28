import Debug from 'debug';
import axios from 'axios';
import ConfigurationManager from '@config/ConfigurationManager';

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
}
