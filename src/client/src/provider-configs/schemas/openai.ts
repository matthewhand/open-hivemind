import { ProviderConfigSchema } from '../types';
import { ModelAutocomplete } from '../../components/DaisyUI';

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
    temperature: 0.7
  },
  fields: [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: true,
      description: 'Your OpenAI API key',
      placeholder: 'sk-1234567890123456789012345678901234567890123456789012345678901234',
      group: 'Authentication'
    },
    {
      name: 'organizationId',
      label: 'Organization ID (Optional)',
      type: 'text',
      required: false,
      description: 'Your OpenAI organization ID',
      placeholder: 'org-123456789012345678901234567890',
      group: 'Authentication'
    },
    {
      name: 'baseUrl',
      label: 'Base URL (Optional)',
      type: 'url',
      required: false,
      description: 'Custom API base URL for third-party OpenAI-compatible providers (OPENAI_BASE_URL)',
      placeholder: 'https://api.openai.com/v1 or https://your-proxy.com/v1',
      group: 'Third-Party Compatibility'
    },
    {
      name: 'model',
      label: 'Model',
      type: 'model-autocomplete',
      required: true,
      description: 'Select or enter the GPT model to use. Models are automatically fetched from your API.',
      placeholder: 'gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo...',
      defaultValue: 'gpt-4',
      component: ModelAutocomplete,
      componentProps: {
        providerType: 'openai',
        placeholder: 'Enter model name or select from available models...',
        label: 'Model Selection'
      },
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
      validation: { min: 1, max: 32768 },
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
      placeholder: '1',
      defaultValue: 1,
      validation: { min: 0, max: 1 },
      group: 'Model Configuration'
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
      group: 'Model Configuration'
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
      group: 'Model Configuration'
    }
  ]
};