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
  key: 'flowise',
  label: 'Flowise',
  type: 'llm',
  docsUrl: 'https://docs.flowiseai.com',
  fields: {
    required: [
      {
        name: 'FLOWISE_API_ENDPOINT',
        type: 'text',
        label: 'API Endpoint',
        description: 'Base URL of your Flowise instance e.g. http://localhost:3000',
      },
    ],
    optional: [
      {
        name: 'FLOWISE_CONVERSATION_CHATFLOW_ID',
        type: 'text',
        label: 'Conversation Chatflow ID',
        description: 'Default chatflow ID for conversation interactions',
      },
      {
        name: 'FLOWISE_COMPLETION_CHATFLOW_ID',
        type: 'text',
        label: 'Completion Chatflow ID',
        description: 'Chatflow ID for text completion tasks',
      },
      {
        name: 'FLOWISE_API_KEY',
        type: 'password',
        label: 'API Key',
        description: 'API key if Flowise authentication is enabled',
      },
    ],
    advanced: [
      {
        name: 'FLOWISE_USE_REST',
        type: 'boolean',
        label: 'Use REST API',
        description: 'Use the REST client instead of the Flowise SDK',
        default: 'false',
      },
    ],
  },
};
