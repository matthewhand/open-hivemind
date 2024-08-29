import { getEnvConfig } from '../configUtils';

class OpenAIConfig {
    public readonly OPENAI_API_KEY: string = getEnvConfig('OPENAI_API_KEY', 'openai.apiKey', '');
    public readonly OPENAI_TEMPERATURE: number = getEnvConfig('OPENAI_TEMPERATURE', 'openai.temperature', 0.7);
    public readonly OPENAI_MAX_TOKENS: number = getEnvConfig('OPENAI_MAX_TOKENS', 'openai.maxTokens', 150);
    public readonly OPENAI_FREQUENCY_PENALTY: number = getEnvConfig('OPENAI_FREQUENCY_PENALTY', 'openai.frequencyPenalty', 0.1);
    public readonly OPENAI_PRESENCE_PENALTY: number = getEnvConfig('OPENAI_PRESENCE_PENALTY', 'openai.presencePenalty', 0.05);
    public readonly OPENAI_BASE_URL: string = getEnvConfig('OPENAI_BASE_URL', 'openai.baseUrl', 'https://api.openai.com');
    public readonly OPENAI_TIMEOUT: number = getEnvConfig('OPENAI_TIMEOUT', 'openai.timeout', 10000);
    public readonly OPENAI_ORGANIZATION: string | undefined = getEnvConfig('OPENAI_ORGANIZATION', 'openai.organization', '');
    public readonly OPENAI_MODEL: string = getEnvConfig('OPENAI_MODEL', 'openai.model', 'gpt4');

    public readonly OPENAI_STOP: string[] = getEnvConfig('OPENAI_STOP', 'openai.stop', []);
    public readonly OPENAI_TOP_P: number = getEnvConfig('OPENAI_TOP_P', 'openai.topP', 0.9);
    public readonly OPENAI_SYSTEM_PROMPT: string = getEnvConfig('OPENAI_SYSTEM_PROMPT', 'openai.systemPrompt', 'Greetings, human...');
    public readonly OPENAI_RESPONSE_MAX_TOKENS: number = getEnvConfig('OPENAI_RESPONSE_MAX_TOKENS', 'openai.responseMaxTokens', 100);
    public readonly LLM_PARALLEL_EXECUTION: boolean = getEnvConfig('LLM_PARALLEL_EXECUTION', 'openai.parallelExecution', false);
    public readonly OPENAI_FINISH_REASON_RETRY: string = getEnvConfig('OPENAI_FINISH_REASON_RETRY', 'openai.finishReasonRetry', 'length');
    public readonly OPENAI_MAX_RETRIES: number = getEnvConfig('OPENAI_MAX_RETRIES', 'openai.maxRetries', 3);
}

export default OpenAIConfig;
