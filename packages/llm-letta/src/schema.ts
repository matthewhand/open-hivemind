export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[]; // for 'select' type
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'llm';
  docsUrl?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

export const schema: ProviderSchema = {
  key: 'letta',
  label: 'Letta',
  type: 'llm',
  docsUrl: 'https://docs.letta.com',
  fields: {
    required: [
      {
        name: 'LETTA_BASE_URL',
        type: 'text',
        label: 'Base URL',
        description: 'Base URL of your Letta server e.g. http://localhost:8283',
      },
    ],
    optional: [
      {
        name: 'LETTA_API_KEY',
        type: 'password',
        label: 'API Key',
        description: 'API key if Letta authentication is enabled',
      },
      {
        name: 'LETTA_AGENT_ID',
        type: 'text',
        label: 'Default Agent ID',
        description: 'Default agent ID to use when none is provided in metadata',
      },
    ],
    advanced: [
      {
        name: 'LETTA_TIMEOUT',
        type: 'number',
        label: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
        default: '30000',
      },
    ],
  },
};
