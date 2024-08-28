import ConfigurationManager from '@src/common/config/ConfigurationManager';

const configManager = new ConfigurationManager();

export async function sendChatCompletionsRequest(prompt: string): Promise<any> {
    const apiKey = configManager.OPENAI_API_KEY;
    const baseURL = configManager.OPENAI_BASE_URL;
    const timeout = configManager.OPENAI_TIMEOUT;
    const organization = configManager.OPENAI_ORGANIZATION;
    const model = configManager.OPENAI_MODEL;
    const maxTokens = configManager.LLM_RESPONSE_MAX_TOKENS;
    const temperature = configManager.OPENAI_TEMPERATURE;
    const stop = configManager.LLM_STOP;
    const topP = configManager.LLM_TOP_P;

    // Logic to send the chat completion request using the configuration values
}
