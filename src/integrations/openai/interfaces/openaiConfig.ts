import convict from 'convict';

const openaiConfig = convict({
    OPENAI_API_KEY: {
        doc: 'OpenAI API Key',
        format: String,
        default: '',
        env: 'OPENAI_API_KEY'
    },
    OPENAI_MODEL: {
        doc: 'OpenAI Model',
        format: String,
        default: 'gpt-4',
        env: 'OPENAI_MODEL'
    },
    OPENAI_VOICE: {
        doc: 'OpenAI Voice for TTS',
        format: String,
        default: 'nova',
        env: 'OPENAI_VOICE'
    },
    OPENAI_BASE_URL: {
        doc: 'OpenAI API Base URL',
        format: String,
        default: 'https://api.openai.com',
        env: 'OPENAI_BASE_URL'
    },
    OPENAI_TIMEOUT: {
        doc: 'Timeout for OpenAI requests (ms)',
        format: 'nat',
        default: 10000,
        env: 'OPENAI_TIMEOUT'
    },
    OPENAI_TEMPERATURE: {
        doc: 'OpenAI Temperature',
        format: Number,
        default: 0.7,
        env: 'OPENAI_TEMPERATURE'
    },
    OPENAI_MAX_TOKENS: {
        doc: 'OpenAI Max Tokens',
        format: Number,
        default: 150,
        env: 'OPENAI_MAX_TOKENS'
    },
    OPENAI_FREQUENCY_PENALTY: {
        doc: 'OpenAI Frequency Penalty',
        format: Number,
        default: 0.1,
        env: 'OPENAI_FREQUENCY_PENALTY'
    },
    OPENAI_PRESENCE_PENALTY: {
        doc: 'OpenAI Presence Penalty',
        format: Number,
        default: 0.05,
        env: 'OPENAI_PRESENCE_PENALTY'
    },
    OPENAI_ORGANIZATION: {
        doc: 'OpenAI Organization',
        format: String,
        default: '',
        env: 'OPENAI_ORGANIZATION'
    },
    OPENAI_STOP: {
        doc: 'OpenAI Stop Sequences',
        format: Array,
        default: [],
        env: 'OPENAI_STOP'
    },
    OPENAI_TOP_P: {
        doc: 'OpenAI Top P',
        format: Number,
        default: 0.9,
        env: 'OPENAI_TOP_P'
    },
    OPENAI_SYSTEM_PROMPT: {
        doc: 'OpenAI System Prompt',
        format: String,
        default: 'Greetings, human...',
        env: 'OPENAI_SYSTEM_PROMPT'
    },
    OPENAI_RESPONSE_MAX_TOKENS: {
        doc: 'OpenAI Response Max Tokens',
        format: Number,
        default: 100,
        env: 'OPENAI_RESPONSE_MAX_TOKENS'
    },
    OPENAI_MAX_RETRIES: {
        doc: 'Maximum number of retries for OpenAI requests',
        format: 'nat',
        default: 3,
        env: 'OPENAI_MAX_RETRIES'
    },
    LLM_PARALLEL_EXECUTION: {
        doc: 'Whether to allow parallel execution of OpenAI requests',
        format: Boolean,
        default: false,
        env: 'LLM_PARALLEL_EXECUTION'
    }
});

openaiConfig.validate({ allowed: 'strict' });

export default openaiConfig;
/**
 * Interface for the OpenAI configuration settings.
 */
export interface OpenAiConfig {
    /**
     * The API key for accessing OpenAI services.
     */
    OPENAI_API_KEY: string;

    /**
     * The specific model to use for requests (e.g., "gpt-4").
     */
    OPENAI_MODEL?: string;

    /**
     * The voice setting for voice synthesis, if applicable.
     */
    OPENAI_VOICE?: string;

    /**
     * The temperature setting for generating responses, controlling creativity.
     */
    OPENAI_TEMPERATURE?: number;

    /**
     * The maximum number of retries for API requests.
     */
    OPENAI_MAX_RETRIES?: number;
}
