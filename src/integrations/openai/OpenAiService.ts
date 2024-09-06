import Debug from 'debug';
import { OpenAI, ClientOptions } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import llmConfig from '@llm/interfaces/llmConfig';
import { generateChatResponse } from './operations/generateChatResponse';
import { createChatCompletion } from './chat/createChatCompletion';
import { listModels } from './operations/listModels';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');

if (!openaiConfig || typeof openaiConfig.get !== 'function') {
    throw new Error('Invalid OpenAI configuration: expected an object with a get method.');
}

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
    private readonly requestTimeout: number = parseInt(openaiConfig.get<string>('OPENAI_TIMEOUT') || '30000');

    private constructor() {
        const options: ClientOptions = {
            apiKey: openaiConfig.get('OPENAI_API_KEY')!,
            organization: openaiConfig.get('OPENAI_ORGANIZATION') || undefined,
            baseURL: openaiConfig.get('OPENAI_BASE_URL') || 'https://api.openai.com',
            timeout: this.requestTimeout,
        };
        this.openai = new OpenAI(options);
        this.parallelExecution = Boolean(llmConfig.get('LLM_PARALLEL_EXECUTION'));
        this.finishReasonRetry = String(openaiConfig.get('OPENAI_FINISH_REASON_RETRY') || 'stop');
        this.maxRetries = parseInt(String(openaiConfig.get('OPENAI_MAX_RETRIES') || '3'));
        debug('[DEBUG] OpenAiService initialized with API Key:', options.apiKey);
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

    public async createChatCompletion(
        historyMessages: IMessage[],
        systemMessageContent: string = openaiConfig.get('OPENAI_SYSTEM_PROMPT')!,
        maxTokens: number = parseInt(String(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS') || '150'))
    ): Promise<any> {
        return createChatCompletion(this.openai, historyMessages, systemMessageContent, maxTokens);
    }

    public async generateChatResponse(message: string, historyMessages: IMessage[]): Promise<string | null> {
        return generateChatResponse(this, message, historyMessages, {
            parallelExecution: this.parallelExecution,
            maxRetries: this.maxRetries,
            finishReasonRetry: this.finishReasonRetry,
            isBusy: this.isBusy.bind(this),
            setBusy: this.setBusy.bind(this),
        });
    }

    public async listModels(): Promise<any> {
        return listModels(this.openai);
    }
}

export default OpenAiService.getInstance();
