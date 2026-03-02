import type { ProviderConfigSchema } from '../types';

export const openWebUIProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'openwebui',
  displayName: 'OpenWebUI',
  description: 'Connect to an OpenWebUI instance',
  icon: '🧠',
  color: '#2563EB',
  defaultConfig: {},
  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      description: 'OpenWebUI API key',
      placeholder: 'sk-123456789012345678901234567890',
      group: 'Authentication',
    },
    {
      name: 'apiUrl',
      label: 'API URL',
      type: 'url',
      required: true,
      description: 'OpenWebUI API base URL',
      placeholder: 'http://localhost:3000/api',
      group: 'Connection',
    },
    {
      name: 'model',
      label: 'Model',
      type: 'text',
      required: true,
      description: 'Model to use in OpenWebUI',
      placeholder: 'llama3',
      group: 'Model Configuration',
    },
  ],
};
