import type { ProviderConfigSchema } from '../types';

export const export const openWebUIProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'openwebui',
  displayName: 'OpenWebUI',
  description: 'Connect to an OpenWebUI instance',
  icon: '🧠',
  color: '#2563EB',
  defaultConfig: {
    model: 'llama3',
  },
  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      description: 'Your OpenWebUI API key',
      placeholder: 'sk-123456789012345678901234567890',
      validation: {
        minLength: 20,
      },
      group: 'Authentication',
    },
    {
      name: 'apiUrl',
      label: 'API URL',
      type: 'url',
      required: true,
      description: 'OpenWebUI API base URL (include /api if required by your instance)',
      placeholder: 'http://localhost:3000/api',
      defaultValue: 'http://localhost:3000/api',
      validation: {
        pattern: '^https?://.+',
      },
      group: 'Connection',
    },
    {
      name: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      description: 'Model ID to use in OpenWebUI (e.g., llama3, gpt-4, etc.)',
      placeholder: 'llama3',
      defaultValue: 'llama3',
      validation: {
        minLength: 1,
        maxLength: 100,
      },
      group: 'Model Configuration',
    },
  ],
};;
