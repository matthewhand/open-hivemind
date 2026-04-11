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
  key: 'mem4ai',
  label: 'Mem4AI',
  type: 'memory',
  fields: {
    required: [
      {
        name: 'apiUrl',
        type: 'text',
        label: 'API URL',
        description: 'Mem4ai API endpoint (e.g. https://api.mem4ai.com/v1)',
      },
      {
        name: 'apiKey',
        type: 'password',
        label: 'API Key',
        description: 'API key for authenticating with the Mem4ai server',
      },
    ],
    optional: [
      {
        name: 'organizationId',
        type: 'text',
        label: 'Organization ID',
        description: 'Optional organization ID sent as X-Organization-ID header',
      },
      {
        name: 'userId',
        type: 'text',
        label: 'Default User ID',
        description: 'Default user scope for memory operations',
      },
      {
        name: 'agentId',
        type: 'text',
        label: 'Default Agent ID',
        description: 'Default agent scope for memory operations',
      },
      {
        name: 'embeddingProviderId',
        type: 'text',
        label: 'Embedding Provider ID',
        description: 'LLM profile key to use for embedding-driven memory operations',
      },
    ],
    advanced: [
      {
        name: 'limit',
        type: 'number',
        label: 'Default Result Limit',
        description: 'Maximum memories returned per query',
        default: '10',
      },
      {
        name: 'timeout',
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
