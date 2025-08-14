import convict from 'convict';
import path from 'path';
import type { ConfigModuleMeta } from './ConfigSpec';

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
} catch {
  // Fallback to defaults if config file is missing or invalid
  debug(`Warning: Could not load openai config from ${configPath}, using defaults`);
}

export default openaiConfig;

export const configMeta: ConfigModuleMeta = {
  module: 'openaiConfig',
  keys: [
    { key: 'OPENAI_API_KEY', group: 'llm', level: 'basic', doc: 'OpenAI API key', env: 'OPENAI_API_KEY', sensitive: true },
    { key: 'OPENAI_MODEL', group: 'llm', level: 'advanced', doc: 'Model name', env: 'OPENAI_MODEL', default: 'gpt-3.5-turbo' },
    { key: 'OPENAI_BASE_URL', group: 'llm', level: 'advanced', doc: 'Base URL', env: 'OPENAI_BASE_URL', default: 'https://api.openai.com/v1' },
    { key: 'OPENAI_TIMEOUT', group: 'llm', level: 'advanced', doc: 'Request timeout (ms)', env: 'OPENAI_TIMEOUT', default: 10000 },
    { key: 'OPENAI_TEMPERATURE', group: 'llm', level: 'advanced', doc: 'Sampling temperature', env: 'OPENAI_TEMPERATURE', default: 0.7 },
    { key: 'OPENAI_MAX_TOKENS', group: 'llm', level: 'advanced', doc: 'Max tokens', env: 'OPENAI_MAX_TOKENS', default: 150 },
    { key: 'OPENAI_FREQUENCY_PENALTY', group: 'llm', level: 'advanced', env: 'OPENAI_FREQUENCY_PENALTY', default: 0.1 },
    { key: 'OPENAI_PRESENCE_PENALTY', group: 'llm', level: 'advanced', env: 'OPENAI_PRESENCE_PENALTY', default: 0.05 },
    { key: 'OPENAI_STOP', group: 'llm', level: 'advanced', env: 'OPENAI_STOP', default: [] },
    { key: 'OPENAI_TOP_P', group: 'llm', level: 'advanced', env: 'OPENAI_TOP_P', default: 1.0 },
    { key: 'OPENAI_SYSTEM_PROMPT', group: 'llm', level: 'advanced', env: 'OPENAI_SYSTEM_PROMPT', default: 'Greetings, human...' },
    { key: 'OPENAI_RESPONSE_MAX_TOKENS', group: 'llm', level: 'advanced', env: 'OPENAI_RESPONSE_MAX_TOKENS', default: 100 },
    { key: 'OPENAI_MAX_RETRIES', group: 'llm', level: 'advanced', env: 'OPENAI_MAX_RETRIES', default: 3 },
    { key: 'OPENAI_FINISH_REASON_RETRY', group: 'llm', level: 'advanced', env: 'OPENAI_FINISH_REASON_RETRY', default: 'stop' },
    { key: 'OPENAI_VOICE', group: 'llm', level: 'advanced', doc: 'Voice for TTS', env: 'OPENAI_VOICE', default: 'nova' },
    { key: 'OPENAI_ORGANIZATION', group: 'llm', level: 'advanced', env: 'OPENAI_ORGANIZATION' }
  ]
};
