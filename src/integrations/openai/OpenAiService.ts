/**
 * OpenAiService provides a singleton interface for interacting with the OpenAI API.
 * It includes functionality for generating chat completions, checking service status,
 * and listing available models. Configuration details are retrieved from external
 * configuration sources like 'openaiConfig' and 'llmConfig'.
 */
import Debug from 'debug';
const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');
import { OpenAI, ClientOptions } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import llmConfig from '@llm/interfaces/llmConfig';
import { listModels } from './operations/listModels';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getEmoji } from '@common/getEmoji';

const debug = Debug('app:OpenAiService');

// Manually define ChatCompletionMessage structure
interface ChatCompletionMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Guard: Validate openaiConfig object
if (!openaiConfig || typeof openaiConfig.get !== 'function') {
    throw new Error('Invalid OpenAI configuration: expected an object with a get method.');
}

// Guard: Validate llmConfig object
if (!llmConfig || typeof llmConfig.get !== 'function') {
    throw new Error('Invalid LLM configuration: expected an object with a get method.');
}

export class OpenAiService {
    private static instance: OpenAiService;
    public readonly openai: OpenAI;
    private busy: boolean = false;
    private readonly parallelExecution: boolean;
    private readonly finishReasonRetry: string;
    private readonly maxRetries: number;
    private readonly requestTimeout: number;

    /**
     * Private constructor to initialize the OpenAI client and configuration.
     * Retrieves API key, timeout, and other settings from openaiConfig.
     */
    private constructor() {
        const timeoutValue = Number(openaiConfig.get('OPENAI_TIMEOUT') || 30000);
        this.requestTimeout = timeoutValue;

        const options: ClientOptions = {
            apiKey: String(openaiConfig.get('OPENAI_API_KEY') || ''),
            organization: String(openaiConfig.get('OPENAI_ORGANIZATION') || ''),
            baseURL: String(openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com'),
            timeout: timeoutValue,
        };

        // Initialize OpenAI client
        this.openai = new OpenAI(options);
        this.parallelExecution = Boolean(llmConfig.get('LLM_PARALLEL_EXECUTION'));
        this.finishReasonRetry = openaiConfig.get<'OPENAI_FINISH_REASON_RETRY'>('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = Number(openaiConfig.get('OPENAI_MAX_RETRIES') || 3);

        debug('[DEBUG] OpenAiService initialized with API Key:', this.redactApiKeyForLogging(String(options.apiKey || '')), 'Timeout:', this.requestTimeout);
    }

    /**
     * Singleton pattern to get the instance of OpenAiService.
     * Ensures only one instance is active at a time.
     */
    public static getInstance(): OpenAiService {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }

    /**
     * Checks whether the service is currently busy processing requests.
     * @returns {boolean} True if busy, false otherwise.
     */
    public isBusy(): boolean {
        return this.busy;
    }

    /**
     * Sets the busy status of the service.
     * @param status - True to set the service as busy, false to set it as idle.
     */
    public setBusy(status: boolean): void {
        this.busy = status;
    }

    /**
     * Generates a chat completion from OpenAI based on the user's message and history.
     * Handles system messages, user input, and message history.
     * @param message - The user's input message.
     * @param historyMessages - Previous chat messages.
     * @param systemMessageContent - A system-level message to initialize the chat context.
     * @param maxTokens - Maximum number of tokens for the response (default: 150).
     * @param temperature - Controls randomness in the response (default: 0.7).
     * @returns {Promise<any>} The generated chat completion response or error.
     */
    public async generateChatCompletion(
        message: string,
        historyMessages: IMessage[],
        systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
        maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
        temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
    ): Promise<any> {
        const chatParams: ChatCompletionMessage[] = [
            { role: 'system', content: systemMessageContent },
            { role: 'user', content: message },
            ...historyMessages.map((msg) => ({
                role: (msg.isFromBot() ? 'assistant' : 'user') as 'user' | 'assistant',
                content: msg.getText() || getEmoji()  // Use random emoji as fallback
            }))
        ];

        try {
            const response = await this.openai.chat.completions.create({
                model: openaiConfig.get('OPENAI_MODEL') || 'gpt-3.5-turbo',
                messages: chatParams,
                max_tokens: maxTokens,
                temperature,
                stream: false
            });

            return response.choices[0]?.message.content || null;
        } catch (error: any) {
            debug('Error generating chat completion:', { message, historyMessages, error: error.message });
            throw new Error(`Failed to generate chat completion: ${error.message}`);
        }
    }

    /**
     * Generates a chat response using OpenAI, passthrough to generateChatCompletion.
     * @param message - The user's input message.
     * @param historyMessages - Previous chat messages.
     * @param systemMessageContent - A system-level message to initialize the chat context.
     * @param maxTokens - Maximum number of tokens for the response (default: 150).
     * @param temperature - Controls randomness in the response (default: 0.7).
     * @returns {Promise<any>} The generated chat response or error.
     */
    public async generateChatResponse(
        message: string,
        historyMessages: IMessage[],
        systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
        maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
        temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
    ): Promise<any> {
        // Passthrough to generateChatCompletion
        return this.generateChatCompletion(message, historyMessages, systemMessageContent, maxTokens, temperature);
    }

    /**
     * Lists available OpenAI models by invoking the OpenAI API.
     * @returns {Promise<any>} A list of models or error if retrieval fails.
     */
    public async listModels(): Promise<any> {
        return listModels(this.openai);
    }

    /**
     * Redacts the OpenAI API key for logging purposes, ensuring it is not exposed in logs.
     * @param key - The API key to be redacted.
     * @returns {string} The redacted API key or the original key if debugging is disabled.
     */
    private redactApiKeyForLogging(key: string): string {
        if (debug.enabled) {
            return redactSensitiveInfo('OPENAI_API_KEY', key);
        }
        return key;
    }
}

export default OpenAiService.getInstance();
