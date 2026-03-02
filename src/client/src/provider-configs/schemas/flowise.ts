import type { ProviderConfigSchema } from '../types';

export const flowiseProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'flowise',
  displayName: 'Flowise',
  description: 'Connect to Flowise workflow engine for LLM capabilities',
  icon: '🔀', // Or another suitable icon
  color: '#3498DB', // Adjust color as needed
  defaultConfig: {
    useRest: true,
  },
  fields: [
    {
      name: 'apiUrl',
      label: 'API URL',
      type: 'url',
      required: true,
      description: 'Flowise API base URL',
      placeholder: 'http://localhost:3000/api/v1',
      group: 'Connection',
    },
    {
      name: 'apiKey',
      label: 'API Key (Optional)',
      type: 'password',
      required: false,
      description: 'Flowise API key',
      placeholder: 'your-flowise-api-key',
      group: 'Authentication',
    },
    {
      name: 'chatflowId',
      label: 'Chatflow ID',
      type: 'text',
      required: true,
      description: 'Specific chatflow ID to use',
      placeholder: 'chatflow-id-uuid',
      group: 'Configuration',
    },
  ],
};
