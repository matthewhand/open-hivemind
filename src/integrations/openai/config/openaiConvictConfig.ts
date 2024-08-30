import convict from 'convict';

// Define a schema for OpenAI configuration
const openaiConfig = convict({
  OPENAI_API_KEY: {
    doc: 'OpenAI API Key',
    format: String,
    default: '',
    env: 'OPENAI_API_KEY',
  },
  OPENAI_MODEL: {
    doc: 'OpenAI Model',
    format: String,
    default: 'gpt-4',
    env: 'OPENAI_MODEL',
  },
  OPENAI_VOICE: {
    doc: 'OpenAI Voice for TTS',
    format: String,
    default: 'nova',
    env: 'OPENAI_VOICE',
  },
  OPENAI_BASE_URL: {
    doc: 'OpenAI API Base URL',
    format: String,
    default: 'https://api.openai.com',
    env: 'OPENAI_BASE_URL',
  },
  OPENAI_TIMEOUT: {
    doc: 'Timeout for OpenAI requests (ms)',
    format: 'nat',
    default: 10000,
    env: 'OPENAI_TIMEOUT',
  },
});

openaiConfig.validate({ allowed: 'strict' }); // Validate configuration

export default openaiConfig;
