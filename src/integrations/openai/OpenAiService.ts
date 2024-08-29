import Debug from 'debug';
import ConfigurationManager from '@common/config/ConfigurationManager';
import { OpenAI, ClientOptions } from 'openai';
import { createChatCompletionRequest } from './chat/createChatCompletionRequest';
import { completeSentence } from './operations/completeSentence';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:OpenAiService');
const configManager = new ConfigurationManager();

export class OpenAiService {
    private static instance: OpenAiService;
    private readonly openai: OpenAI;
    private busy: boolean = false;
    private readonly parallelExecution: boolean;
    private readonly finishReasonRetry: string;
    private readonly maxRetries: number;

    private constructor() {
        const options: ClientOptions = {
            apiKey: configManager.OPENAI_API_KEY,
            organization: configManager.OPENAI_ORGANIZATION || undefined,
            baseURL: configManager.OPENAI_BASE_URL,
            timeout: configManager.OPENAI_TIMEOUT,
        };

        this.openai = new OpenAI(options);
        this.parallelExecution = configManager.LLM_PARALLEL_EXECUTION;
        this.finishReasonRetry = configManager.OPENAI_FINISH_REASON_RETRY;
        this.maxRetries = configManager.OPENAI_MAX_RETRIES;
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
        systemMessageContent: string = configManager.LLM_SYSTEM_PROMPT,
        maxTokens: number = configManager.LLM_RESPONSE_MAX_TOKENS
    ): Promise<OpenAI.Chat.ChatCompletion> {
        try {
            const requestBody = createChatCompletionRequest(historyMessages, systemMessageContent, maxTokens);
            const response = await this.openai.chat.completions.create(requestBody) as OpenAI.Chat.ChatCompletion;
            return response;
        } catch (error: any) {
            debug('createChatCompletion: Error occurred:', error);
            throw error;
        }
    }

    // Rest of the class...
}
