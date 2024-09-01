import convict from 'convict';

/**
 * Configuration schema for LLM settings using the convict library.
 */
const llmConfig = convict({
    /**
     * LLM provider (e.g., openai).
     */
    LLM_PROVIDER: {
        doc: 'LLM provider (e.g., openai)',
        format: String,
        default: 'openai',
        env: 'LLM_PROVIDER'
    },
    /**
     * LLM model to be used (e.g., gpt-4).
     */
    LLM_MODEL: {
        doc: 'LLM model (e.g., gpt-4)',
        format: String,
        default: 'gpt-4',
        env: 'LLM_MODEL'
    },
    /**
     * Temperature setting controlling creativity of LLM responses.
     */
    LLM_TEMPERATURE: {
        doc: 'Temperature for LLM responses',
        format: Number,
        default: 0.7,
        env: 'LLM_TEMPERATURE'
    },
    /**
     * Maximum tokens allowed for LLM responses.
     */
    LLM_MAX_TOKENS: {
        doc: 'Maximum tokens for LLM responses',
        format: Number,
        default: 150,
        env: 'LLM_MAX_TOKENS'
    },
    /**
     * Top P sampling for LLM responses.
     */
    LLM_TOP_P: {
        doc: 'Top P sampling for LLM responses',
        format: Number,
        default: 0.9,
        env: 'LLM_TOP_P'
    },
    /**
     * Frequency penalty applied to LLM responses.
     */
    LLM_FREQUENCY_PENALTY: {
        doc: 'Frequency penalty for LLM responses',
        format: Number,
        default: 0.1,
        env: 'LLM_FREQUENCY_PENALTY'
    },
    /**
     * Presence penalty applied to LLM responses.
     */
    LLM_PRESENCE_PENALTY: {
        doc: 'Presence penalty for LLM responses',
        format: Number,
        default: 0.05,
        env: 'LLM_PRESENCE_PENALTY'
    },
    /**
     * Timeout setting for LLM requests in milliseconds.
     */
    LLM_TIMEOUT: {
        doc: 'Timeout for LLM requests (ms)',
        format: Number,
        default: 10000,
        env: 'LLM_TIMEOUT'
    }
});

// Validate the configuration against the schema with strict mode
llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
