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
  key: 'openai',
  label: 'OpenAI',
  type: 'llm',
  docsUrl: 'https://platform.openai.com/docs',
  fields: {
    required: [
      {
        name: 'OPENAI_API_KEY',
        type: 'password',
        label: 'API Key',
        description: 'From platform.openai.com/api-keys',
      },
    ],
    optional: [
      {
        name: 'OPENAI_MODEL',
        type: 'text',
        label: 'Model',
        description: 'Model name e.g. gpt-4o, gpt-4-turbo',
        default: 'gpt-4o',
      },
      {
        name: 'OPENAI_SYSTEM_PROMPT',
        type: 'text',
        label: 'System Prompt',
        description: 'Default system prompt sent to the model',
        default: 'You are a helpful assistant.',
      },
      {
        name: 'OPENAI_ORGANIZATION',
        type: 'text',
        label: 'Organization ID',
        description: 'OpenAI organization ID (optional)',
      },
    ],
    advanced: [
      {
        name: 'OPENAI_MAX_TOKENS',
        type: 'number',
        label: 'Max Tokens',
        description: 'Maximum tokens for completion responses',
        default: '150',
      },
      {
        name: 'OPENAI_RESPONSE_MAX_TOKENS',
        type: 'number',
        label: 'Response Max Tokens',
        description: 'Maximum tokens for chat completion responses',
        default: '100',
      },
      {
        name: 'OPENAI_TEMPERATURE',
        type: 'number',
        label: 'Temperature',
        description: 'Sampling temperature (0.0–2.0)',
        default: '0.7',
      },
      {
        name: 'OPENAI_BASE_URL',
        type: 'text',
        label: 'Base URL',
        description: 'Override for Azure or proxy endpoints',
        default: 'https://api.openai.com/v1',
      },
      {
        name: 'OPENAI_TIMEOUT',
        type: 'number',
        label: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
        default: '10000',
      },
      {
        name: 'OPENAI_MAX_RETRIES',
        type: 'number',
        label: 'Max Retries',
        description: 'Maximum number of retry attempts on failure',
        default: '3',
      },
      {
        name: 'OPENAI_FREQUENCY_PENALTY',
        type: 'number',
        label: 'Frequency Penalty',
        description: 'Penalise repeated tokens (0.0–2.0)',
        default: '0.1',
      },
      {
        name: 'OPENAI_PRESENCE_PENALTY',
        type: 'number',
        label: 'Presence Penalty',
        description: 'Penalise tokens already present in context (0.0–2.0)',
        default: '0.05',
      },
      {
        name: 'OPENAI_TOP_P',
        type: 'number',
        label: 'Top-P',
        description: 'Nucleus sampling probability mass',
        default: '1.0',
      },
    ],
  },
};
