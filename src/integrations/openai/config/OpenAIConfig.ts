import { getConfigOrWarn } from '@config/getConfigOrWarn';

class OpenAIConfig {
    public readonly OPENAI_API_KEY: string = getConfigOrWarn('OPENAI_API_KEY', '');
    public readonly OPENAI_TEMPERATURE: number = getConfigOrWarn('OPENAI_TEMPERATURE', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = getConfigOrWarn('OPENAI_MAX_TOKENS', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = getConfigOrWarn('OPENAI_FREQUENCY_PENALTY', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = getConfigOrWarn('OPENAI_PRESENCE_PENALTY', 0.05);
    public readonly OPENAI_BASE_URL: string = getConfigOrWarn('OPENAI_BASE_URL', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = getConfigOrWarn('OPENAI_TIMEOUT', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = getConfigOrWarn('OPENAI_ORGANIZATION', '');
    public readonly OPENAI_MODEL: string = this.getEnvOrConfig('OPENAI_MODEL', 'openai.model', 'gpt4');
    public readonly OPENAI_VOICE: string = this.getEnvOrConfig('OPENAI_VOICE', 'openai.voice', 'nova');

    public readonly OPENAI_STOP: string[] = getConfigOrWarn('OPENAI_STOP', []);
    public readonly OPENAI_TOP_P: number = getConfigOrWarn('OPENAI_TOP_P', 0.9);
    public readonly OPENAI_SYSTEM_PROMPT: string = getConfigOrWarn('OPENAI_SYSTEM_PROMPT', 'Greetings, human...');
    public readonly OPENAI_RESPONSE_MAX_TOKENS: number = getConfigOrWarn('OPENAI_RESPONSE_MAX_TOKENS', 100);

    constructor() {
        // Validate essential configurations
        if (!this.OPENAI_API_KEY || !this.OPENAI_BASE_URL || !this.OPENAI_MODEL) {
            throw new Error('Missing critical OpenAI configuration. Please check your environment variables or config files.');
        }
        console.log('OpenAIConfig initialized');
    }

    private getEnvOrConfig(envVar: string, configKey: string, fallbackValue: string): string {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            return envValue;
        }
        return getConfigOrWarn(configKey, configKey, fallbackValue);
    }
}

export default OpenAIConfig;
