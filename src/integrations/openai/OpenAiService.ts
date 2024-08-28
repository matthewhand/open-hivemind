import Debug from 'debug';
import ConfigurationManager from '@common/config/ConfigurationManager';
import { OpenAIApi, Configuration } from 'openai';
import { createChatCompletionRequestBody } from './operations/createChatCompletionRequestBody';

const debug = Debug('app:OpenAiService');
const configManager = new ConfigurationManager();

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

        this.openai = new OpenAIApi(configuration);
        this.parallelExecution = configManager.get('llm.openai.chatCompletions.parallel_execution', false);
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

    public async generateChatResponse(message: string, historyMessages: any[]): Promise<any> {
        if (!this.openai.configuration.apiKey) {
            debug('generateChatResponse: API key is missing');
            return null;
        }

        debug('generateChatResponse: Building request body');
        const requestBody = await createChatCompletionRequestBody([
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
            const response = await this.openai.createChatCompletion(requestBody);

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
