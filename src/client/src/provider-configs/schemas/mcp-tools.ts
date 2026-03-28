import type { ProviderConfigSchema } from '../types';

/**
 * MCP (Model Context Protocol) Tool Provider Configuration Schema
 *
 * Allows connecting to MCP servers via different transports (stdio, SSE,
 * streamable-http) so that the tools they expose can be offered to bots.
 */
export const mcpToolsSchema: ProviderConfigSchema = {
  type: 'tool',
  providerType: 'mcp-tools',
  displayName: 'MCP Tools',
  description: 'Connect to MCP servers to provide tools to bots',
  icon: '🔧',
  color: '#6366F1',
  fields: [
    {
      name: 'serverUrl',
      label: 'Server URL',
      type: 'url',
      required: true,
      description: 'URL of the MCP server to connect to',
      placeholder: 'http://localhost:3001',
    },
    {
      name: 'transport',
      label: 'Transport',
      type: 'select',
      required: true,
      description: 'Communication transport used by the MCP server',
      options: [
        { value: 'sse', label: 'SSE (Server-Sent Events)', description: 'HTTP-based streaming transport' },
        { value: 'stdio', label: 'Stdio', description: 'Spawn a local process and communicate over stdin/stdout' },
        { value: 'streamable-http', label: 'Streamable HTTP', description: 'Newer HTTP streaming transport' },
      ],
      defaultValue: 'sse',
    },
    {
      name: 'command',
      label: 'Command (stdio)',
      type: 'text',
      required: false,
      description: 'Command to start the MCP server process (only for stdio transport)',
      placeholder: 'npx -y @modelcontextprotocol/server-everything',
      dependsOn: { field: 'transport', value: 'stdio' },
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'password',
      required: false,
      description: 'Optional authentication key for the MCP server',
      placeholder: 'sk-...',
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      required: false,
      description: 'Maximum time to wait for tool execution (milliseconds)',
      defaultValue: 30000,
      validation: {
        min: 1000,
        max: 300000,
      },
    },
    {
      name: 'autoReconnect',
      label: 'Auto-reconnect',
      type: 'boolean',
      required: false,
      description: 'Automatically reconnect when the connection drops',
      defaultValue: true,
    },
  ],
  defaultConfig: {
    serverUrl: '',
    transport: 'sse',
    command: '',
    apiKey: '',
    timeout: 30000,
    autoReconnect: true,
  },
};
