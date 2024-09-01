import convict from 'convict';

const llmConfig = convict({
    LLM_PROVIDER: {
        doc: 'LLM provider (e.g., openai)',
        format: String,
        default: 'openai',
        env: 'LLM_PROVIDER'
    },
    LLM_MODEL: {
        doc: 'LLM model (e.g., gpt-4)',
        format: String,
        default: 'gpt-4',
        env: 'LLM_MODEL'
    },
    LLM_TEMPERATURE: {
        doc: 'Temperature for LLM responses',
        format: Number,
        default: 0.7,
        env: 'LLM_TEMPERATURE'
    },
    LLM_MAX_TOKENS: {
        doc: 'Maximum tokens for LLM responses',
        format: Number,
        default: 150,
        env: 'LLM_MAX_TOKENS'
    },
    LLM_TOP_P: {
        doc: 'Top P sampling for LLM responses',
        format: Number,
        default: 0.9,
        env: 'LLM_TOP_P'
    },
    LLM_FREQUENCY_PENALTY: {
        doc: 'Frequency penalty for LLM responses',
        format: Number,
        default: 0.1,
        env: 'LLM_FREQUENCY_PENALTY'
    },
    LLM_PRESENCE_PENALTY: {
        doc: 'Presence penalty for LLM responses',
        format: Number,
        default: 0.05,
        env: 'LLM_PRESENCE_PENALTY'
    },
    LLM_TIMEOUT: {
        doc: 'Timeout for LLM requests (ms)',
        format: Number,
        default: 10000,
        env: 'LLM_TIMEOUT'
    }
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
