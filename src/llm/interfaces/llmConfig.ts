import convict from 'convict';

// Custom format for array of strings
convict.addFormat({
  name: 'string-array',
  validate: (val) => {
    if (typeof val !== 'string' && !Array.isArray(val)) {
      throw new Error('Must be a string or array');
    }
  },
  coerce: (val: string | string[]) => {
    if (Array.isArray(val)) return val.map(v => v.trim());
    return val.split(',').map((v: string) => v.trim());
  }
});

const llmConfig = convict({
  LLM_PROVIDER: {
    doc: 'Comma-separated LLM providers (e.g., openai,groknado)',
    format: 'string-array',
    default: ['openai'],
    env: 'LLM_PROVIDER'
  },
  LLM_PARALLEL_EXECUTION: {
    doc: 'Whether to allow parallel execution of LLM requests',
    format: Boolean,
    default: false,
    env: 'LLM_PARALLEL_EXECUTION'
  },
  OPENAI_API_KEY: {
    doc: 'API Key for OpenAI',
    format: String,
    default: '',
    env: 'OPENAI_API_KEY'
  },
  OPENAI_TEMPERATURE: {
    doc: 'Sampling temperature for OpenAI',
    format: Number,
    default: 0.7,
    env: 'OPENAI_TEMPERATURE'
  },
  OPENAI_MAX_TOKENS: {
    doc: 'Maximum tokens for OpenAI completion',
    format: 'int',
    default: 150,
    env: 'OPENAI_MAX_TOKENS'
  },
  OPENAI_FREQUENCY_PENALTY: {
    doc: 'Frequency penalty for OpenAI',
    format: Number,
    default: 0.1,
    env: 'OPENAI_FREQUENCY_PENALTY'
  },
  OPENAI_PRESENCE_PENALTY: {
    doc: 'Presence penalty for OpenAI',
    format: Number,
    default: 0.05,
    env: 'OPENAI_PRESENCE_PENALTY'
  },
  OPENAI_BASE_URL: {
    doc: 'Base URL for OpenAI API',
    format: String,
    default: 'https://api.openai.com',
    env: 'OPENAI_BASE_URL'
  },
  OPENAI_TIMEOUT: {
    doc: 'API request timeout (ms) for OpenAI',
    format: 'int',
    default: 10000,
    env: 'OPENAI_TIMEOUT'
  },
  OPENAI_ORGANIZATION: {
    doc: 'OpenAI organization ID',
    format: String,
    default: '',
    env: 'OPENAI_ORGANIZATION'
  },
  OPENAI_MODEL: {
    doc: 'OpenAI model to use',
    format: String,
    default: 'gpt-4o',
    env: 'OPENAI_MODEL'
  },
  OPENAI_STOP: {
    doc: 'Stop sequences for OpenAI',
    format: Array,
    default: ['\n', '.', '?', '!'],
    env: 'OPENAI_STOP'
  },
  OPENAI_TOP_P: {
    doc: 'Top-p sampling for OpenAI',
    format: Number,
    default: 0.9,
    env: 'OPENAI_TOP_P'
  },
  OPENAI_SYSTEM_PROMPT: {
    doc: 'System prompt for OpenAI',
    format: String,
    default: 'Greetings, human...',
    env: 'OPENAI_SYSTEM_PROMPT'
  },
  OPENAI_RESPONSE_MAX_TOKENS: {
    doc: 'Max tokens for OpenAI response',
    format: 'int',
    default: 100,
    env: 'OPENAI_RESPONSE_MAX_TOKENS'
  }
});

llmConfig.validate({ allowed: 'strict' });

export default llmConfig;
