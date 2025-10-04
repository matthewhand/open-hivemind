import { ProviderConfigSchema } from '../types';

export const anthropicProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'anthropic',
  displayName: 'Anthropic Claude',
  description: 'Connect to Anthropic Claude models and compatible providers',
  icon: '🧠',
  color: '#D97757',
  defaultConfig: {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4096,
    temperature: 0.7
  },
  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      description: 'Your Anthropic API key',
      placeholder: 'sk-ant-1234567890123456789012345678901234567890123456789012345678901234',
      group: 'Authentication'
    },
    {
      name: 'baseUrl',
      label: 'Base URL (Optional)',
      type: 'url',
      required: false,
      description: 'Custom API base URL for third-party Anthropic-compatible providers (ANTHROPIC_BASE_URL)',
      placeholder: 'https://api.anthropic.com or https://your-proxy.com',
      group: 'Third-Party Compatibility'
    },
    {
      name: 'model',
      label: 'Model',
      type: 'model-autocomplete',
      required: true,
      description: 'Select or enter the Claude model to use. Predefined models are shown, with support for custom models.',
      placeholder: 'claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307...',
      defaultValue: 'claude-3-sonnet-20240229',
            group: 'Model Configuration'
    },
    {
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      required: true,
      description: 'Maximum number of tokens in the response',
      placeholder: '4096',
      defaultValue: 4096,
      validation: { min: 1, max: 4096 },
      group: 'Model Configuration'
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'number',
      required: true,
      description: 'Controls randomness (0 = deterministic, 1 = very creative)',
      placeholder: '0.7',
      defaultValue: 0.7,
      validation: { min: 0, max: 1 },
      group: 'Model Configuration'
    },
    {
      name: 'topP',
      label: 'Top P',
      type: 'number',
      required: false,
      description: 'Controls diversity via nucleus sampling (0-1)',
      placeholder: '1',
      defaultValue: 1,
      validation: { min: 0, max: 1 },
      group: 'Model Configuration'
    },
    {
      name: 'topK',
      label: 'Top K',
      type: 'number',
      required: false,
      description: 'Controls diversity via top-k sampling',
      placeholder: '0',
      defaultValue: 0,
      validation: { min: 0, max: 500 },
      group: 'Model Configuration'
    }
  ]
};