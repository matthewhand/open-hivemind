import type { ProviderConfigSchema } from '../types';
import { validateApiKey, getApiKeyFormatHint } from '../../utils/apiKeyValidation';

export const openAIProviderSchema: ProviderConfigSchema = {
  type: 'llm',
  providerType: 'openai',
  displayName: 'OpenAI',
  description: 'Connect to OpenAI GPT models and compatible providers',
  icon: '🤖',
  color: '#10A37F',
  defaultConfig: {
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.7,
  },
  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      description: 'Your OpenAI API key (starts with sk- followed by 48 characters)',
      placeholder: 'sk-...',
      group: 'Authentication',
      validation: {
        pattern: '^sk-[A-Za-z0-9]{48}$',
        custom: (value: string) => {
          const result = validateApiKey('openai', value, false);
          if (!result.isValid) {
            return result.message || 'Invalid API key format';
          }
          return null;
        },
      },
    },
    {
      name: 'organizationId',
      label: 'Organization ID',
      type: 'text',
      required: false,
      description: 'Your OpenAI organization ID',
      placeholder: 'org-123456789012345678901234567890',
      group: 'Authentication',
    },
    {
      name: 'baseUrl',
      label: 'Base URL',
      type: 'url',
      required: false,
      description: 'Custom API base URL for third-party OpenAI-compatible providers (OPENAI_BASE_URL)',
      placeholder: 'https://api.openai.com/v1 or https://your-proxy.com/v1',
      group: 'Third-Party Compatibility',
    },
    {
      name: 'model',
      label: 'Model',
      type: 'model-autocomplete',
      required: true,
      description: 'Select or enter the GPT model to use. Models are automatically fetched from your API.',
      placeholder: 'gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo...',
      defaultValue: 'gpt-4',
      group: 'Model Configuration',
      componentProps: {
        providerType: 'openai',
      },
    },
    {
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      required: true,
      description: 'Maximum number of tokens in the response',
      placeholder: '2048',
      defaultValue: 2048,
      validation: { min: 1, max: 32768 },
      group: 'Model Configuration',
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
      group: 'Model Configuration',
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
      group: 'Model Configuration',
    },
    {
      name: 'frequencyPenalty',
      label: 'Frequency Penalty',
      type: 'number',
      required: false,
      description: 'Penalize repeated tokens (-2 to 2)',
      placeholder: '0',
      defaultValue: 0,
      validation: { min: -2, max: 2 },
      group: 'Model Configuration',
    },
    {
      name: 'presencePenalty',
      label: 'Presence Penalty',
      type: 'number',
      required: false,
      description: 'Penalize presence of repeated tokens (-2 to 2)',
      placeholder: '0',
      defaultValue: 0,
      validation: { min: -2, max: 2 },
      group: 'Model Configuration',
    },
  ],
};