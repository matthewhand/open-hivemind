import ConfigurationManager from '../ConfigurationManager';

class OpenAIConfig extends ConfigurationManager {
    public readonly OPENAI_API_KEY: string = this.getEnvConfig('OPENAI_API_KEY', 'openai.apiKey', 'DUMMY-KEY-OOBABOOGAFTW');
    public readonly OPENAI_TEMPERATURE: number = this.getEnvConfig('OPENAI_TEMPERATURE', 'openai.temperature', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = this.getEnvConfig('OPENAI_MAX_TOKENS', 'openai.maxTokens', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = this.getEnvConfig('OPENAI_FREQUENCY_PENALTY', 'openai.frequencyPenalty', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = this.getEnvConfig('OPENAI_PRESENCE_PENALTY', 'openai.presencePenalty', 0.05);
    public readonly OPENAI_BASE_URL: string = this.getEnvConfig('OPENAI_BASE_URL', 'openai.baseUrl', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = this.getEnvConfig('OPENAI_TIMEOUT', 'openai.timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = this.getEnvConfig('OPENAI_ORGANIZATION', 'openai.organization', '');
    public readonly OPENAI_MODEL: string = this.getEnvConfig('OPENAI_MODEL', 'openai.model', 'gpt4');

    public readonly OPENAI_STOP: string[] = this.getEnvConfig('OPENAI_STOP', 'openai.stop', []);
    public readonly OPENAI_TOP_P: number = this.getEnvConfig('OPENAI_TOP_P', 'openai.topP', 0.9);
    public readonly OPENAI_SYSTEM_PROMPT: string = this.getEnvConfig('OPENAI_SYSTEM_PROMPT', 'openai.systemPrompt', 'Greetings, human...');
    public readonly OPENAI_RESPONSE_MAX_TOKENS: number = this.getEnvConfig('OPENAI_RESPONSE_MAX_TOKENS', 'openai.responseMaxTokens', 100);
}

export default OpenAIConfig;
