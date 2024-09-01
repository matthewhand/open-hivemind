import ConfigurationManager from '@config/ConfigurationManager';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llmConfig') as unknown as { LLM_PROVIDER: string; LLM_STOP?: string[]; LLM_SYSTEM_PROMPT?: string; LLM_RESPONSE_MAX_TOKENS?: number; LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION?: boolean };

if (!llmConfig.LLM_PROVIDER) {
    throw new Error('LLM provider is not configured.');
}

export function getLlmProvider(): string {
    return llmConfig.LLM_PROVIDER;
}

export function getLlmSystemPrompt(): string {
    return llmConfig.LLM_SYSTEM_PROMPT || 'Default system prompt';
}

export function getLlmStop(): string[] | undefined {
    return llmConfig.LLM_STOP;
}

export function getLlmMaxTokens(): number {
    return llmConfig.LLM_RESPONSE_MAX_TOKENS || 150;
}
