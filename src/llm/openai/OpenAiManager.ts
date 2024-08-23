import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';
import logger from '@src/utils/logger';
import { IMessage } from '@src/message/types/IMessage';
import LLMResponse from '@src/llm/LLMResponse';
import { buildRequestBody } from '@src/llm/openai/utils/buildRequestBody';
import { sendRequest } from '@src/llm/openai/utils/sendRequest';

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

    public async requestWithHistory(historyMessages: IMessage[]): Promise<LLMResponse> {
        const requestBody = buildRequestBody(historyMessages);
        return sendRequest(this, requestBody);
    }
}

export default OpenAiManager;
