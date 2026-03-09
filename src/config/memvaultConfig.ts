import convict from 'convict';
import path from 'path';

export interface MemVaultConfig {
  /** Use cloud or self-hosted */
  mode: 'cloud' | 'self-hosted';
  /** API Key for cloud mode */
  apiKey: string;
  /** Base URL for API */
  baseUrl: string;
  /** Database URL (self-hosted only) */
  databaseUrl: string;
  /** Use existing LLM OpenAI config for embeddings */
  useLLMConfig: boolean;
  /** OpenAI API Key (only if useLLMConfig is false) */
  openaiApiKey: string;
  /** Search strategy */
  searchStrategy: 'hybrid' | 'vector' | 'keyword';
  /** Default user ID */
  defaultUserId: string;
}

const memvaultConfig = convict<MemVaultConfig>({
  mode: {
    doc: 'MemVault mode: cloud (managed) or self-hosted',
    format: ['cloud', 'self-hosted'],
    default: 'cloud',
    env: 'MEMVAULT_MODE',
  },
  apiKey: {
    doc: 'MemVault API Key (for cloud mode)',
    format: String,
    default: '',
    sensitive: true,
    env: 'MEMVAULT_API_KEY',
  },
  baseUrl: {
    doc: 'MemVault API URL',
    format: String,
    default: 'https://api.memvault.ai',
    env: 'MEMVAULT_BASE_URL',
  },
  databaseUrl: {
    doc: 'PostgreSQL connection URL (for self-hosted mode)',
    format: String,
    default: '',
    sensitive: true,
    env: 'DATABASE_URL',
  },
  useLLMConfig: {
    doc: 'Use existing LLM OpenAI config for embeddings (recommended)',
    format: Boolean,
    default: true,
    env: 'MEMVAULT_USE_LLM_CONFIG',
  },
  openaiApiKey: {
    doc: 'OpenAI API Key (only needed if useLLMConfig is false)',
    format: String,
    default: '',
    sensitive: true,
    env: 'MEMVAULT_OPENAI_API_KEY',
  },
  searchStrategy: {
    doc: 'Search strategy: hybrid (vector + keyword), vector, or keyword',
    format: ['hybrid', 'vector', 'keyword'],
    default: 'hybrid',
    env: 'MEMVAULT_SEARCH_STRATEGY',
  },
  defaultUserId: {
    doc: 'Default user ID for memory operations',
    format: String,
    default: 'default',
    env: 'MEMVAULT_DEFAULT_USER_ID',
  },
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/memvault.json');

import Debug from 'debug';
const debug = Debug('app:memvaultConfig');

try {
  memvaultConfig.loadFile(configPath);
  memvaultConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded MemVault config from ${configPath}`);
} catch {
  debug(`Warning: Could not load memvault config from ${configPath}, using env vars and defaults`);
}

export default memvaultConfig;
