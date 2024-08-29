import config from 'config';

class LlmConfig {
    public readonly LLM_PROVIDER: string;
    public readonly LLM_MODEL: string;
    public readonly LLM_TEMPERATURE: number;
    public readonly LLM_MAX_TOKENS: number;
    public readonly LLM_TOP_P: number;
    public readonly LLM_FREQUENCY_PENALTY: number;
    public readonly LLM_PRESENCE_PENALTY: number;
    public readonly LLM_TIMEOUT: number;

    constructor() {
        this.LLM_PROVIDER = process.env.LLM_PROVIDER || config.get<string>('llm.LLM_PROVIDER') || 'openai';
        this.LLM_MODEL = process.env.LLM_MODEL || config.get<string>('llm.LLM_MODEL') || 'gpt-4';
        this.LLM_TEMPERATURE = Number(process.env.LLM_TEMPERATURE) || config.get<number>('llm.LLM_TEMPERATURE') || 0.7;
        this.LLM_MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS) || config.get<number>('llm.LLM_MAX_TOKENS') || 150;
        this.LLM_TOP_P = Number(process.env.LLM_TOP_P) || config.get<number>('llm.LLM_TOP_P') || 0.9;
        this.LLM_FREQUENCY_PENALTY = Number(process.env.LLM_FREQUENCY_PENALTY) || config.get<number>('llm.LLM_FREQUENCY_PENALTY') || 0.1;
        this.LLM_PRESENCE_PENALTY = Number(process.env.LLM_PRESENCE_PENALTY) || config.get<number>('llm.LLM_PRESENCE_PENALTY') || 0.05;
        this.LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT) || config.get<number>('llm.LLM_TIMEOUT') || 10000;
    }
}

export default LlmConfig;
