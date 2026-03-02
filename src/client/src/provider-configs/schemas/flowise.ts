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
      name: 'apiEndpoint',
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
      name: 'conversationChatflowId',
      label: 'Conversation Chatflow ID',
      type: 'text',
      required: true,
      description: 'The ID of the chatflow to use for conversations',
      placeholder: 'chatflow-id-uuid',
      group: 'Configuration',
    },
    {
      name: 'completionChatflowId',
      label: 'Completion Chatflow ID (Optional)',
      type: 'text',
      required: false,
      description: 'The ID of the chatflow to use for text completion tasks',
      placeholder: 'completion-chatflow-id-uuid',
      group: 'Configuration',
    },
    {
      name: 'useRest',
      label: 'Use REST API',
      type: 'boolean',
      required: false,
      description: 'Use REST API instead of Socket.io for communication',
      defaultValue: true,
      group: 'Advanced',
    },
  ],
};
