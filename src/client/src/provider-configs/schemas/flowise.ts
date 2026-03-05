import type { ProviderConfigSchema } from '../types';

export const flowiseProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'flowise',
  displayName: 'Flowise',
  description: 'Connect to Flowise workflow engine for LLM capabilities',
  icon: '⚡', // Or another suitable icon
  color: '#3498DB', // Adjust color as needed
  defaultConfig: {},
  fields: [
    {
      name: 'apiUrl',
      label: 'API Endpoint',
      type: 'url',
      required: true,
      description: 'Your Flowise API endpoint URL',
      placeholder: 'http://localhost:3000',
      group: 'Connection',
    },
    {
      name: 'apiKey',
      label: 'API Key (Optional)',
      type: 'password',
      required: false,
      description: 'Your Flowise API key if required',
      placeholder: 'your-flowise-api-key',
      group: 'Authentication',
    },
    {
      name: 'chatflowId',
      label: 'Chatflow ID',
      type: 'text',
      required: true,
      description: 'The ID of the chatflow to use for conversations',
      placeholder: 'chatflow-id-uuid',
      group: 'Configuration',
    },
  ],
};
