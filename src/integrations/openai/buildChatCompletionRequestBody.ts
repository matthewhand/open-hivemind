import ConfigurationManager from '@config/ConfigurationManager';

const configManager = new ConfigurationManager();

export function buildChatCompletionRequestBody(historyMessages: any[]): object {
    const model = configManager.OPENAI_MODEL;
    const temperature = configManager.OPENAI_TEMPERATURE;
    const maxTokens = configManager.LLM_RESPONSE_MAX_TOKENS;
    const systemPrompt = configManager.LLM_SYSTEM_PROMPT;
    const stop = configManager.LLM_STOP;
    const supportNameField = configManager.LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION;

    // Logic to build the chat completion request body using the configuration values
}
