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
  key: 'openswarm',
  label: 'OpenSwarm',
  type: 'llm',
  docsUrl: 'https://github.com/openai/swarm',
  fields: {
    required: [
      {
        name: 'OPENSWARM_BASE_URL',
        type: 'text',
        label: 'Base URL',
        description: 'Base URL of the OpenSwarm API server (e.g. http://localhost:8000/v1)',
        default: 'http://localhost:8000/v1',
      },
    ],
    optional: [
      {
        name: 'OPENSWARM_API_KEY',
        type: 'password',
        label: 'API Key',
        description: 'API key for authenticating with the OpenSwarm server',
        default: 'dummy-key',
      },
      {
        name: 'OPENSWARM_TEAM',
        type: 'text',
        label: 'Team Name',
        description: 'OpenSwarm team name used as the model identifier',
        default: 'default-team',
      },
    ],
    advanced: [],
  },
};
