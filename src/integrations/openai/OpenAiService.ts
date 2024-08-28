import OpenAI from 'openai';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import { IMessage } from '@src/message/interfaces/IMessage';
import { buildChatCompletionRequestBody } from '@src/integrations/openai/buildChatCompletionRequestBody';

/**
 * OpenAiService class interacts with OpenAI's API to perform tasks such as generating completions.
 * 
 * This class uses the official OpenAI SDK to manage API calls and is configurable through
 * the ConfigurationManager. It handles the request-building process and manages responses from
 * OpenAI's services.
 */
export class OpenAiService {
    private openai: OpenAI;
    private busy: boolean;
    private static instance: OpenAiService;

    private constructor() {
        this.openai = new OpenAI({
            apiKey: ConfigurationManager.OPENAI_API_KEY,
            baseURL: ConfigurationManager.OPENAI_BASE_URL,
            timeout: ConfigurationManager.OPENAI_TIMEOUT,
            organization: ConfigurationManager.OPENAI_ORGANIZATION,
        });
        this.busy = false;
    }

    public static getInstance(): OpenAiService {
        if (!OpenAiService.instance) {
            OpenAiService.instance = new OpenAiService();
        }
        return OpenAiService.instance;
    }

    public getClient(): OpenAI {
        return this.openai;
    }

    public setBusy(state: boolean): void {
        this.busy = state;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public isValidRole(role: string): boolean {
        const validRoles = ['user', 'system', 'assistant'];
        return validRoles.includes(role);
    }

    public getModel(): string {
        return ConfigurationManager.OPENAI_MODEL;
    }

    public async createChatCompletion(prompt: string): Promise<any> {
        return this.openai.completions.create({
            model: this.getModel(),
            prompt,
            max_tokens: ConfigurationManager.OPENAI_MAX_TOKENS,
            temperature: ConfigurationManager.OPENAI_TEMPERATURE,
            frequency_penalty: ConfigurationManager.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: ConfigurationManager.OPENAI_PRESENCE_PENALTY,
        });
    }
}
