import Debug from 'debug';
const { redactSensitiveInfo } = require('@common/redactSensitiveInfo');
import { OpenAI, ClientOptions } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import llmConfig from '@llm/interfaces/llmConfig';
import { listModels } from './operations/listModels';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');

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

    private constructor() {
        const timeoutValue = Number(openaiConfig.get('OPENAI_TIMEOUT') || 30000);
        this.requestTimeout = timeoutValue;

        const options: ClientOptions = {
            apiKey: String(openaiConfig.get('OPENAI_API_KEY') || ''),
            organization: String(openaiConfig.get('OPENAI_ORGANIZATION') || ''),
            baseURL: String(openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com'),
            timeout: timeoutValue,
        };

        this.openai = new OpenAI(options);
        this.parallelExecution = Boolean(llmConfig.get('LLM_PARALLEL_EXECUTION'));
        this.finishReasonRetry = openaiConfig.get<'OPENAI_FINISH_REASON_RETRY'>('OPENAI_FINISH_REASON_RETRY') || 'stop';
        this.maxRetries = Number(openaiConfig.get('OPENAI_MAX_RETRIES') || 3);

        debug('[DEBUG] OpenAiService initialized with API Key:', this.redactApiKeyForLogging(String(options.apiKey || '')), 'Timeout:', this.requestTimeout);
    }

    public static getInstance(): OpenAiService {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public setBusy(status: boolean): void {
        this.busy = status;
    }

    public async generateChatCompletion(
        message: string,
        historyMessages: IMessage[],
        systemMessageContent: string = String(openaiConfig.get('OPENAI_SYSTEM_PROMPT') || ''),
        maxTokens: number = Number(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || 150),
        temperature: number = Number(openaiConfig.get('OPENAI_TEMPERATURE') || 0.7)
    ): Promise<any> {
        const chatParams = [
            { role: 'system', content: systemMessageContent },
            { role: 'user', content: message },
            ...historyMessages.map((msg) => ({ role: msg.role, content: msg.content, name: msg.getAuthorId() || 'unknown' }))
        ];

        try {
            const response = await this.openai.chat.completions.create({
                model: openaiConfig.get('OPENAI_MODEL') || 'gpt-3.5-turbo',
                messages: chatParams,
                max_tokens: maxTokens,
                temperature,
            });

            return response.choices[0]?.message.content || null;
        } catch (error: any) {
            debug('Error:', error.message);
            throw new Error(`Failed to generate chat completion: ${error.message}`);
        }
    }

    public async listModels(): Promise<any> {
        return listModels(this.openai);
    }

    private redactApiKeyForLogging(key: string): string {
        if (debug.enabled) {
            return redactSensitiveInfo('OPENAI_API_KEY', key);
        }
        return key;
    }
}

export default OpenAiService.getInstance();
