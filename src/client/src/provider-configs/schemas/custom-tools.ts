import type { ProviderConfigSchema } from '../types';

/**
 * Custom HTTP Tool Provider Configuration Schema
 *
 * Exposes arbitrary HTTP/REST endpoints as tools that bots can invoke.
 * Supports multiple authentication schemes and accepts tool definitions as
 * a JSON array describing the available endpoints.
 */
export const customToolsSchema: ProviderConfigSchema = {
  type: 'tool',
  providerType: 'custom-http',
  displayName: 'Custom HTTP Tools',
  description: 'Expose HTTP endpoints as bot tools',
  icon: '🌐',
  color: '#10B981',
  fields: [
    {
      name: 'baseUrl',
      label: 'Base URL',
      type: 'url',
      required: true,
      description: 'Base URL for the HTTP tool endpoints',
      placeholder: 'https://api.example.com',
    },
    {
      name: 'authType',
      label: 'Auth Type',
      type: 'select',
      required: true,
      description: 'Authentication method used to call the endpoints',
      options: [
        { value: 'none', label: 'None' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'api-key', label: 'API Key' },
        { value: 'basic', label: 'Basic Auth' },
      ],
      defaultValue: 'none',
    },
    {
      name: 'authToken',
      label: 'Auth Token',
      type: 'password',
      required: false,
      description: 'Authentication token (for Bearer or API Key auth)',
      placeholder: 'token or key value',
      dependsOn: { field: 'authType', value: 'bearer' },
    },
    {
      name: 'toolDefinitions',
      label: 'Tool Definitions (JSON)',
      type: 'textarea',
      required: false,
      description: 'JSON array describing available tools and their endpoints',
      placeholder: '[{"name": "search", "description": "Search the web", "endpoint": "/search", "method": "POST"}]',
      validation: {
        maxLength: 10000,
      },
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      required: false,
      description: 'Maximum time to wait for HTTP responses (milliseconds)',
      defaultValue: 15000,
      validation: {
        min: 1000,
        max: 120000,
      },
    },
  ],
  defaultConfig: {
    baseUrl: '',
    authType: 'none',
    authToken: '',
    toolDefinitions: '',
    timeout: 15000,
  },
};
