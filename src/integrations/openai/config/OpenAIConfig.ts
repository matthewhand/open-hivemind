import ConfigurationManager from '@config/ConfigurationManager';
const configManager = ConfigurationManager.getInstance();

class OpenAIConfig {
    public readonly OPENAI_API_KEY: string = configManager.getEnvConfig('OPENAI_API_KEY', 'llm.openai.apiKey', 'your-openai-api-key');
    public readonly OPENAI_TEMPERATURE: number = configManager.getEnvConfig('OPENAI_TEMPERATURE', 'llm.openai.temperature', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = configManager.getEnvConfig('OPENAI_MAX_TOKENS', 'llm.openai.maxTokens', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = configManager.getEnvConfig('OPENAI_FREQUENCY_PENALTY', 'llm.openai.frequencyPenalty', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = configManager.getEnvConfig('OPENAI_PRESENCE_PENALTY', 'llm.openai.presencePenalty', 0.05);
    public readonly OPENAI_BASE_URL: string = configManager.getEnvConfig('OPENAI_BASE_URL', 'llm.openai.apiUrl', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = configManager.getEnvConfig('OPENAI_TIMEOUT', 'llm.openai.timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = configManager.getEnvConfig('OPENAI_ORGANIZATION', 'llm.openai.organization', undefined);
    public readonly OPENAI_MODEL: string = configManager.getEnvConfig('OPENAI_MODEL', 'llm.openai.model', 'gpt4');
    public readonly OPENAI_VOICE: string = configManager.getEnvConfig('OPENAI_VOICE', 'llm.openai.voice', 'nova');
    public readonly OPENAI_STOP: string[] = configManager.getEnvConfig('OPENAI_STOP', 'llm.openai.stop', []);
    public readonly OPENAI_TOP_P: number = configManager.getEnvConfig('OPENAI_TOP_P', 'llm.openai.topP', 0.9);
    public readonly OPENAI_SYSTEM_PROMPT: string = configManager.getEnvConfig('OPENAI_SYSTEM_PROMPT', 'llm.openai.systemPrompt', 'Greetings, human...');
    public readonly OPENAI_RESPONSE_MAX_TOKENS: number = configManager.getEnvConfig('OPENAI_RESPONSE_MAX_TOKENS', 'llm.openai.responseMaxTokens', 100);

    constructor() {
        // Validate essential configurations
        if (!this.OPENAI_API_KEY || !this.OPENAI_BASE_URL || !this.OPENAI_MODEL) {
            throw new Error('Missing critical OpenAI configuration. Please check your environment variables or config files.');
        }
        console.log('OpenAIConfig initialized');
    }
}

export default OpenAIConfig;
