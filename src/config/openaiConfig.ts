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
    default: 'gpt-5.2',
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

/**
 * Interpolate ${ENV_VAR} patterns in loaded config values
 */
function interpolateEnvVars(config: typeof openaiConfig): void {
  const props = config.getProperties();
  for (const key of Object.keys(props)) {
    const value = (props as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.includes('${')) {
      const interpolated = value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
        return process.env[envVar] || '';
      });
      config.set(key as keyof typeof props, interpolated as any);
    }
  }
}

// Note: Removed JSON file loading - convict reads from env vars via schema's `env:` property
// The JSON file was overriding env vars. If you need JSON overrides, uncomment below:
// try {
//   openaiConfig.loadFile(configPath);
//   interpolateEnvVars(openaiConfig);
//   openaiConfig.validate({ allowed: 'strict' });
//   debug(`Successfully loaded OpenAI config from ${configPath}`);
// } catch {
//   debug(`Warning: Could not load openai config from ${configPath}, using defaults`);
// }

openaiConfig.validate({ allowed: 'strict' });
debug('OpenAI config loaded from env vars and defaults');

export default openaiConfig;
