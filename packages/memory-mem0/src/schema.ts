export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[];
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'llm' | 'memory';
  docsUrl?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

export const schema: ProviderSchema = {
  key: 'mem0',
  label: 'Mem0',
  type: 'memory',
  docsUrl: 'https://docs.mem0.ai',
  fields: {
    required: [
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        description: 'API key used for LLM fact extraction and embeddings (e.g. OpenAI key)',
      },
    ],
    optional: [
      {
        name: 'baseUrl',
        type: 'text',
        label: 'Base URL',
        description: 'Base URL of the Mem0 REST API (for self-hosted instances)',
        default: 'https://api.mem0.ai/v1',
      },
      {
        name: 'llmProvider',
        type: 'select',
        label: 'LLM Provider',
        description: 'LLM used to extract facts from conversations',
        default: 'openai',
        options: ['openai', 'anthropic'],
      },
      {
        name: 'llmModel',
        type: 'text',
        label: 'LLM Model',
        description: 'Model name for fact extraction',
        default: 'gpt-4o-mini',
      },
      {
        name: 'embedderModel',
        type: 'text',
        label: 'Embedder Model',
        description: 'Model used to generate memory embeddings',
        default: 'text-embedding-3-small',
      },
      {
        name: 'vectorStoreProvider',
        type: 'select',
        label: 'Vector Store',
        description: 'Where to store memory vectors',
        default: 'memory',
        options: ['memory', 'qdrant', 'pinecone'],
      },
      {
        name: 'userId',
        type: 'text',
        label: 'Default User ID',
        description: 'Default user scope for stored memories',
      },
      {
        name: 'agentId',
        type: 'text',
        label: 'Default Agent ID',
        description: 'Default agent scope for stored memories',
      },
      {
        name: 'orgId',
        type: 'text',
        label: 'Organization ID',
        description: 'Optional organisation ID sent as X-Org-Id header',
      },
    ],
    advanced: [
      {
        name: 'historyDbPath',
        type: 'text',
        label: 'History DB Path',
        description: 'Path to SQLite file for memory change history (optional)',
      },
      {
        name: 'timeoutMs',
        type: 'number',
        label: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
        default: '30000',
      },
      {
        name: 'maxRetries',
        type: 'number',
        label: 'Max Retries',
        description: 'Maximum number of retries on 429/5xx errors',
        default: '3',
      },
    ],
  },
};
