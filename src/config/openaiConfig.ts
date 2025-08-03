import convict from 'convict';
import path from 'path';

const openaiConfig = convict({
  OPENAI_API_KEY: {
    doc: 'OpenAI API key',
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
    doc: 'Max tokens for OpenAI completion',
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
    default: 'https://api.openai.com/v1',
    env: 'OPENAI_BASE_URL'
  },
  OPENAI_TIMEOUT: {
    doc: 'API request timeout for OpenAI (ms)',
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
    default: 'gpt-3.5-turbo',
    env: 'OPENAI_MODEL'
  },
  OPENAI_STOP: {
    doc: 'Stop sequences for OpenAI',
    format: Array,
    default: [],
    env: 'OPENAI_STOP'
  },
  OPENAI_TOP_P: {
    doc: 'Top-p sampling for OpenAI',
    format: Number,
    default: 1.0,
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
  },
  OPENAI_MAX_RETRIES: {
    doc: 'Maximum number of retries for OpenAI requests',
    format: 'int',
    default: 3,
    env: 'OPENAI_MAX_RETRIES'
  },
  OPENAI_FINISH_REASON_RETRY: {
    doc: 'Retry strategy based on finish reason',
    format: String,
    default: 'stop',
    env: 'OPENAI_FINISH_REASON_RETRY'
  },
  OPENAI_VOICE: {
    doc: 'OpenAI Voice for TTS',
    format: String,
    default: 'nova',
    env: 'OPENAI_VOICE'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/openai.json');

import Debug from 'debug';
const debug = Debug('app:openaiConfig');

try {
  openaiConfig.loadFile(configPath);
  openaiConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded OpenAI config from ${configPath}`);
} catch (error) {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load openai config from ${configPath}, using defaults`);
}

export default openaiConfig;
