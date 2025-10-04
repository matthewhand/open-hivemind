import { ProviderSchema } from '../types';

/**
 * MCP (Model Context Protocol) Provider Configuration Schema
 *
 * This schema supports both 'desktop' and 'cloud' MCP servers with flexible
 * command configuration and environment variable management.
 */
export const mcpProviderSchema: ProviderSchema = {
  type: 'mcp',
  name: 'MCP Provider',
  description: 'Model Context Protocol server for external tools and data sources',
  icon: '🔗',
  color: '#3B82F6',
  fields: [
    {
      name: 'name',
      label: 'Provider Name',
      type: 'text',
      required: true,
      description: 'A descriptive name for this MCP provider',
      placeholder: 'e.g., File System Access, Web Scraper',
      validation: {
        minLength: 2,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9\\s\\-_]+$'
      }
    },
    {
      name: 'type',
      label: 'Provider Type',
      type: 'select',
      required: true,
      description: 'Desktop MCP servers typically run locally, Cloud MCP servers require remote configuration',
      options: [
        { value: 'desktop', label: 'Desktop - Local MCP server', description: 'Runs locally on the same machine' },
        { value: 'cloud', label: 'Cloud - Remote MCP server', description: 'Connects to remote MCP service' }
      ],
      defaultValue: 'desktop'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      description: 'Optional description of what this MCP provider does',
      placeholder: 'e.g., Provides file system access for reading and writing files',
      validation: {
        maxLength: 500
      }
    },
    {
      name: 'command',
      label: 'Command',
      type: 'text',
      required: true,
      description: 'The command to start the MCP server process',
      placeholder: 'e.g., npx, python, node, /usr/local/bin/mcp-server',
      validation: {
        minLength: 1,
        maxLength: 200
      }
    },
    {
      name: 'args',
      label: 'Arguments',
      type: 'text',
      required: false,
      description: 'Command line arguments (space-separated or as JSON array)',
      placeholder: 'e.g., --port 3000 --allow-file-system or ["--port", "3000", "--allow-file-system"]',
      validation: {
        maxLength: 1000
      }
    },
    {
      name: 'envVars',
      label: 'Environment Variables',
      type: 'keyvalue',
      required: false,
      description: 'Environment variables for the MCP process (key=value pairs, one per line)',
      placeholder: 'API_KEY=your_api_key_here\nDATABASE_URL=postgresql://localhost/mydb',
      validation: {
        maxItems: 20
      }
    },
    {
      name: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      required: false,
      description: 'Maximum time to wait for MCP server to start (default: 30 seconds)',
      placeholder: '30',
      validation: {
        min: 5,
        max: 300
      },
      defaultValue: 30
    },
    {
      name: 'autoRestart',
      label: 'Auto Restart',
      type: 'checkbox',
      required: false,
      description: 'Automatically restart the MCP server if it crashes',
      defaultValue: true
    },
    {
      name: 'healthCheckEnabled',
      label: 'Enable Health Check',
      type: 'checkbox',
      required: false,
      description: 'Periodically check if the MCP server is still running',
      defaultValue: true
    },
    {
      name: 'healthCheckInterval',
      label: 'Health Check Interval (seconds)',
      type: 'number',
      required: false,
      description: 'How often to check the MCP server health',
      placeholder: '60',
      validation: {
        min: 10,
        max: 3600
      },
      defaultValue: 60,
      dependsOn: {
        field: 'healthCheckEnabled',
        value: true
      }
    },
    {
      name: 'enabled',
      label: 'Enable Provider',
      type: 'checkbox',
      required: false,
      description: 'Enable this MCP provider for use with bots',
      defaultValue: true
    }
  ],
  validation: {
    custom: [
      {
        name: 'validateCommand',
        message: 'Command must be a valid executable name or absolute path',
        validator: (value: string, formData: any) => {
          if (!value || typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!trimmed) return false;

          // Allow common executable names and absolute paths
          const validPatterns = [
            /^[a-zA-Z0-9\\-_]+$/, // Simple executable names like 'node', 'python'
            /^\.\/[a-zA-Z0-9\\-_\\/.]+$/, // Relative paths like './my-server'
            /^\/[a-zA-Z0-9\\-_\\/.]+$/, // Absolute paths like '/usr/bin/node'
            /^[a-zA-Z]:\\[a-zA-Z0-9\\-_\\/.\\]+$/, // Windows paths like 'C:\\Program Files\\node.exe'
            /^npx [a-zA-Z0-9@/.\\-]+$/, // npx commands
            /^npm run [a-zA-Z0-9\\-_]+$/, // npm scripts
            /^yarn [a-zA-Z0-9\\-_]+$/, // yarn commands
            /^python(3)? -m [a-zA-Z0-9._\\-]+$/ // Python modules
          ];

          return validPatterns.some(pattern => pattern.test(trimmed));
        }
      },
      {
        name: 'validateArgs',
        message: 'Arguments must be valid (space-separated or JSON array format)',
        validator: (value: string, formData: any) => {
          if (!value) return true; // Optional field
          try {
            // Try to parse as JSON array first
            JSON.parse(value);
            return true;
          } catch {
            // If not JSON, treat as space-separated arguments
            return typeof value === 'string' && value.trim().length > 0;
          }
        }
      },
      {
        name: 'validateCloudConfig',
        message: 'Cloud providers typically require API keys or connection URLs',
        validator: (value: any, formData: any) => {
          if (formData.type === 'cloud') {
            const envVars = formData.envVars || {};
            const hasConnectionConfig = Object.keys(envVars).some(key =>
              key.toLowerCase().includes('url') ||
              key.toLowerCase().includes('endpoint') ||
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('token')
            );
            if (!hasConnectionConfig) {
              console.warn('Cloud MCP provider recommended to have connection configuration');
            }
          }
          return true; // Warning only, not error
        },
        isWarning: true
      }
    ]
  },
  examples: [
    {
      name: 'File System MCP',
      type: 'desktop',
      description: 'Local file system access for reading and writing files',
      command: 'npx',
      args: '@modelcontextprotocol/server-filesystem',
      envVars: {
        'FILESYSTEM_ROOT': '/tmp/mcp-files'
      },
      enabled: false
    },
    {
      name: 'Web Scraper MCP',
      type: 'desktop',
      description: 'Fetch and extract content from web pages',
      command: 'npx',
      args: '@modelcontextprotocol/server-web-scraper',
      envVars: {},
      enabled: false
    },
    {
      name: 'GitHub MCP',
      type: 'cloud',
      description: 'Access GitHub repositories and issues',
      command: 'npx',
      args: '@modelcontextprotocol/server-github',
      envVars: {
        'GITHUB_TOKEN': 'your_github_token_here'
      },
      enabled: false
    },
    {
      name: 'PostgreSQL MCP',
      type: 'desktop',
      description: 'Query PostgreSQL databases',
      command: 'npx',
      args: '@modelcontextprotocol/server-postgres',
      envVars: {
        'POSTGRES_CONNECTION_STRING': 'postgresql://user:password@localhost:5432/dbname'
      },
      enabled: false
    },
    {
      name: 'Custom MCP Server',
      type: 'desktop',
      description: 'Custom Python MCP server',
      command: 'python',
      args: '-m my_custom_mcp_server',
      envVars: {
        'MY_API_KEY': 'your_api_key_here',
        'DEBUG': 'true'
      },
      enabled: false
    }
  ],
  documentation: {
    overview: 'MCP (Model Context Protocol) providers enable bots to connect to external tools and data sources through a standardized protocol. MCP servers can provide file system access, database queries, web scraping, and many other capabilities.',
    setup: [
      'Choose between Desktop (local) or Cloud (remote) provider type',
      'Specify the command and arguments to start the MCP server',
      'Configure any required environment variables (API keys, database URLs, etc.)',
      'Test the connection to ensure the MCP server starts successfully',
      'Enable the provider for use with your bots'
    ],
    troubleshooting: [
      'Ensure the MCP server command is accessible from the system PATH',
      'Check that all required environment variables are configured',
      'Verify network connectivity for cloud-based MCP providers',
      'Review MCP server logs for startup issues',
      'Consider increasing timeout for slow-starting MCP servers'
    ]
  }
};