import Debug from 'debug';
import ConfigurationManager from '@common/config/ConfigurationManager';
import OpenAI from 'openai';
import { createChatCompletionRequestBody } from './chat/createChatCompletionRequestBody';
import { completeSentence } from './completion/completeSentence';
import { OpenAI as OpenAITypes } from 'openai';

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
        const clientOptions: OpenAITypes.ClientOptions = {
            apiKey: configManager.OPENAI_API_KEY,
            organization: configManager.OPENAI_ORGANIZATION,
            baseURL: configManager.OPENAI_BASE_URL,
            timeout: configManager.OPENAI_TIMEOUT,
            maxRetries: configManager.OPENAI_MAX_RETRIES,
        };

        this.openai = new OpenAI(clientOptions);

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

    public async generateChatResponse(
        message: string, 
        historyMessages: IMessage[]
    ): Promise<any> {
        if (!this.openai.apiKey) {
            debug('generateChatResponse: API key is missing');
            return null;
        }

        debug('generateChatResponse: Building request body');
        const requestBody = await createChatCompletionRequestBody([
            ...historyMessages,
            { role: 'user', content: message } as OpenAITypes.ChatCompletionUserMessageParam,
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
            let response = await this.openai.chat.completions.create(requestBody);
            let finishReason = response.choices[0].finish_reason;

            for (let attempt = 1; attempt <= this.maxRetries && finishReason === this.finishReasonRetry; attempt++) {
                debug(`generateChatResponse: Attempt ${attempt} to complete the response`);
                const completionResult = await completeSentence(this, response.choices[0].message.content);
                if (completionResult) {
                    response.choices[0].message.content = completionResult;
                    finishReason = response.choices[0].finish_reason;
                }
            }

            debug('generateChatResponse: Received response from OpenAI API');
            return response.data;
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
