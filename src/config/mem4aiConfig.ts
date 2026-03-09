import convict from 'convict';
import path from 'path';

export interface Mem4AIConfig {
  /** Use existing LLM OpenAI config for embeddings */
  useLLMConfig: boolean;
  /** Storage path for memory files */
  storagePath: string;
  /** Embedding strategy */
  embeddingStrategy: 'openai' | 'local' | 'custom';
  /** OpenAI API Key (only if useLLMConfig is false) */
  openaiApiKey: string;
  /** OpenAI Base URL (only if useLLMConfig is false) */
  openaiBaseUrl: string;
  /** Embedding model to use */
  embeddingModel: string;
  /** Default user ID */
  defaultUserId: string;
  /** Default agent ID */
  defaultAgentId: string;
}

const mem4aiConfig = convict<Mem4AIConfig>({
  useLLMConfig: {
    doc: 'Use existing LLM OpenAI config for embeddings (recommended)',
    format: Boolean,
    default: true,
    env: 'MEM4AI_USE_LLM_CONFIG',
  },
  storagePath: {
    doc: 'Path to store memory files',
    format: String,
    default: './data/memories',
    env: 'MEM4AI_STORAGE_PATH',
  },
  embeddingStrategy: {
    doc: 'Embedding strategy: openai, local, or custom',
    format: ['openai', 'local', 'custom'],
    default: 'openai',
    env: 'MEM4AI_EMBEDDING_STRATEGY',
  },
  openaiApiKey: {
    doc: 'OpenAI API Key (only needed if useLLMConfig is false)',
    format: String,
    default: '',
    sensitive: true,
    env: 'MEM4AI_OPENAI_API_KEY',
  },
  openaiBaseUrl: {
    doc: 'OpenAI Base URL (only needed if useLLMConfig is false)',
    format: String,
    default: 'https://api.openai.com/v1',
    env: 'MEM4AI_OPENAI_BASE_URL',
  },
  embeddingModel: {
    doc: 'OpenAI embedding model to use',
    format: String,
    default: 'text-embedding-3-small',
    env: 'MEM4AI_EMBEDDING_MODEL',
  },
  defaultUserId: {
    doc: 'Default user ID for memory operations',
    format: String,
    default: 'default',
    env: 'MEM4AI_DEFAULT_USER_ID',
  },
  defaultAgentId: {
    doc: 'Default agent ID for memory operations',
    format: String,
    default: 'default',
    env: 'MEM4AI_DEFAULT_AGENT_ID',
  },
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/mem4ai.json');

import Debug from 'debug';
const debug = Debug('app:mem4aiConfig');

try {
  mem4aiConfig.loadFile(configPath);
  mem4aiConfig.validate({ allowed: 'strict' });
  debug(`Successfully loaded Mem4AI config from ${configPath}`);
} catch {
  debug(`Warning: Could not load mem4ai config from ${configPath}, using env vars and defaults`);
}

export default mem4aiConfig;
