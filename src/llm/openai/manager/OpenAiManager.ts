import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';
import { sendCompletionsRequest } from './sendCompletionsRequest';
import { sendChatCompletionsRequest } from './sendChatCompletionsRequest';
import { summarizeText } from './summarizeText';

class OpenAiManager {
    private static instance: OpenAiManager;
    private openai: OpenAI;
    private busy: boolean;

    private constructor() {
        this.openai = new OpenAI({
            apiKey: constants.LLM_API_KEY,
            baseURL: constants.LLM_ENDPOINT_URL,
        });
        this.busy = false;
    }

    public static getInstance(): OpenAiManager {
        if (!OpenAiManager.instance) {
            OpenAiManager.instance = new OpenAiManager();
        }
        return OpenAiManager.instance;
    }

    public getClient(): OpenAI {
        return this.openai;
    }

    public isBusy(): boolean {
        return this.busy;
    }

    public setBusy(isBusy: boolean): void {
        this.busy = isBusy;
    }

    private isValidRole(role: string): boolean {
        return ['user', 'system', 'assistant', 'function'].includes(role);
    }

    public async buildCompletionsRequest(prompt: string): Promise<object> {
        return {
            model: constants.LLM_MODEL,
            prompt,
            max_tokens: constants.LLM_RESPONSE_MAX_TOKENS,
            temperature: constants.LLM_TEMPERATURE,
            user: constants.INCLUDE_USERNAME_IN_COMPLETION ? 'assistant' : undefined,
        };
    }

    public async buildChatCompletionsRequest(historyMessages: any[]): Promise<object> {
        return {
            model: constants.LLM_MODEL,
            messages: historyMessages.map((msg) => ({
                role: this.isValidRole(msg.role) ? msg.role : 'user',
                content: msg.content,
                name: constants.INCLUDE_USERNAME_IN_CHAT_COMPLETION ? 'assistant' : undefined,
            }))
        };
    }

    public async sendCompletionsRequest(message: string, dryRun: boolean = false): Promise<LLMResponse> {
        return sendCompletionsRequest(this, message, dryRun);
    }

    public async sendChatCompletionsRequest(historyMessages: any[], dryRun: boolean = false): Promise<LLMResponse> {
        return sendChatCompletionsRequest(this, historyMessages, dryRun);
    }

    public async summarizeText(userMessage: string, systemMessageContent: string = constants.LLM_SYSTEM_PROMPT, maxTokens: number = constants.LLM_RESPONSE_MAX_TOKENS): Promise<LLMResponse> {
        return summarizeText(this, userMessage, systemMessageContent, maxTokens);
    }
}

export default OpenAiManager;
