import convict from 'convict';

const llmConfig = convict({
    LLM_PROVIDER: {
        doc: 'The provider for the LLM (e.g., openai)',
        format: String,
        default: 'openai',
        env: 'LLM_PROVIDER',
    },
    LLM_MODEL: {
        doc: 'The specific model to use (e.g., gpt-4)',
        format: String,
        default: 'gpt-4',
        env: 'LLM_MODEL',
    },
    LLM_STOP: {
        doc: 'Stop sequences for the model to end its response',
        format: Array,
        default: [],
        env: 'LLM_STOP',
    },
    LLM_SYSTEM_PROMPT: {
        doc: 'The system prompt to use with the LLM',
        format: String,
        default: '',
        env: 'LLM_SYSTEM_PROMPT',
    },
    LLM_RESPONSE_MAX_TOKENS: {
        doc: 'The maximum number of tokens for responses',
        format: 'int',
        default: 150,
        env: 'LLM_RESPONSE_MAX_TOKENS',
    },
    LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION: {
        doc: 'Whether to include the username in chat completion requests',
        format: Boolean,
        default: false,
        env: 'LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION',
    },
    LLM_PARALLEL_EXECUTION: {
        doc: 'Whether to allow parallel execution of requests',
        format: Boolean,
        default: false,
        env: 'LLM_PARALLEL_EXECUTION',
    },
    LLM_TEMPERATURE: {
        doc: 'Sampling temperature for the model',
        format: Number,
        default: 0.7,
        env: 'LLM_TEMPERATURE',
    },
    LLM_FREQUENCY_PENALTY: {
        doc: 'Frequency penalty to reduce repetition',
        format: Number,
        default: 0.1,
        env: 'LLM_FREQUENCY_PENALTY',
    },
    LLM_PRESENCE_PENALTY: {
        doc: 'Presence penalty to encourage new topics',
        format: Number,
        default: 0.05,
        env: 'LLM_PRESENCE_PENALTY',
    },
    LLM_TOP_P: {
        doc: 'Top P sampling parameter',
        format: Number,
        default: 0.9,
        env: 'LLM_TOP_P',
    },
    LLM_TIMEOUT: {
        doc: 'Timeout for requests to the LLM',
        format: 'int',
        default: 10000,
        env: 'LLM_TIMEOUT',
    },
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
