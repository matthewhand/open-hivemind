import convict from 'convict';
import path from 'path';

const ollamaConfig = convict({
  OLLAMA_BASE_URL: {
    doc: 'Base URL for Ollama API',
    format: String,
    default: 'http://localhost:11434',
    env: 'OLLAMA_BASE_URL'
  },
  OLLAMA_MODEL: {
    doc: 'Ollama model to use',
    format: String,
    default: 'llama2',
    env: 'OLLAMA_MODEL'
  },
  OLLAMA_TEMPERATURE: {
    doc: 'Sampling temperature for Ollama',
    format: Number,
    default: 0.7,
    env: 'OLLAMA_TEMPERATURE'
  },
  OLLAMA_SYSTEM_PROMPT: {
    doc: 'System prompt for Ollama',
    format: String,
    default: 'You are a helpful AI assistant.',
    env: 'OLLAMA_SYSTEM_PROMPT'
  },
  OLLAMA_CONTEXT_WINDOW: {
    doc: 'Context window size',
    format: 'int',
    default: 4096,
    env: 'OLLAMA_CONTEXT_WINDOW'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/ollama.json');

import Debug from 'debug';
const debug = Debug('app:ollamaConfig');

try {
  ollamaConfig.loadFile(configPath);
  ollamaConfig.validate({ allowed: 'warn' });
  debug(`Successfully loaded Ollama config from ${configPath}`);
} catch {
  debug(`Warning: Could not load ollama config from ${configPath}, using defaults`);
}

export default ollamaConfig;
