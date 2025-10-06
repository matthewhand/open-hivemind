import type { ProviderConfigSchema } from '../types';

export const ollamaProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'ollama',
  displayName: 'Ollama',
  description: 'Connect to local Ollama instance and Ollama-compatible APIs',
  icon: '🦙',
  color: '#FF6B35',
  defaultConfig: {
    endpoint: 'http://localhost:11434',
    model: 'llama2',
    maxTokens: 2048,
    temperature: 0.7
  },
  fields: [
    {
      name: 'endpoint',
      label: 'API Endpoint',
      type: 'url',
      required: true,
      description: 'URL of your Ollama server or Ollama-compatible API',
      placeholder: 'http://localhost:11434 or https://your-ollama-compatible-api.com',
      defaultValue: 'http://localhost:11434',
      group: 'Connection'
    },
    {
      name: 'model',
      label: 'Model',
      type: 'model-autocomplete',
      required: true,
      description: 'Select or enter the Ollama model to use. Models are automatically fetched from your Ollama instance.',
      placeholder: 'llama2, codellama, mistral, etc.',
      defaultValue: 'llama2',
            group: 'Model Configuration'
    },
    {
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      required: true,
      description: 'Maximum number of tokens in the response',
      placeholder: '2048',
      defaultValue: 2048,
      validation: { min: 1, max: 8192 },
      group: 'Model Configuration'
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'number',
      required: true,
      description: 'Controls randomness (0 = deterministic, 2 = very creative)',
      placeholder: '0.7',
      defaultValue: 0.7,
      validation: { min: 0, max: 2 },
      group: 'Model Configuration'
    },
    {
      name: 'topP',
      label: 'Top P',
      type: 'number',
      required: false,
      description: 'Controls diversity via nucleus sampling (0-1)',
      placeholder: '0.9',
      defaultValue: 0.9,
      validation: { min: 0, max: 1 },
      group: 'Model Configuration'
    },
    {
      name: 'keepAlive',
      label: 'Keep Alive',
      type: 'text',
      required: false,
      description: 'How long to keep the model loaded in memory',
      placeholder: '5m',
      defaultValue: '5m',
      group: 'Advanced'
    }
  ]
};
