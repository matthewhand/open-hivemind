import { Router } from 'express';

const router = Router();

router.get(['/openapi', '/openapi.json', '/openapi.yaml', '/openapi.yml'], (req, res) => {
  let format = String(req.query.format || 'json').toLowerCase();
  const path = req.path.toLowerCase();

  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    format = 'yaml';
  }

  const host = req.get('host') ?? 'localhost';
  const baseUrl = `${req.protocol}://${host}`;
  const spec = buildSpec(baseUrl);

  if (format === 'yaml' || format === 'yml') {
    res.type('text/yaml').send(toYaml(spec));
    return;
  }

  res.json(spec);
});

function buildSpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Open-Hivemind WebUI API',
      version: '1.0.0',
      description: 'Endpoints used by the Open-Hivemind WebUI for configuration, monitoring, agents, MCP servers, and authentication.',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Current server',
      },
    ],
    paths: {
      // Configuration endpoints
      '/webui/api/config': {
        get: {
          summary: 'Get sanitized bot configuration',
          tags: ['Configuration'],
          responses: {
            200: {
              description: 'Configuration payload',
            },
          },
        },
      },
      '/webui/api/config/hot-reload': {
        post: {
          summary: 'Apply configuration changes to a bot',
          tags: ['Configuration'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['create', 'update', 'delete'] },
                    botName: { type: 'string' },
                    changes: { type: 'object' },
                  },
                  required: ['type', 'changes'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Operation result' },
          },
        },
      },
      // Monitoring endpoints
      '/dashboard/api/status': {
        get: {
          summary: 'Get live bot status',
          tags: ['Monitoring'],
          responses: {
            200: { description: 'Status payload' },
          },
        },
      },
      '/dashboard/api/activity': {
        get: {
          summary: 'Get message activity and timelines',
          tags: ['Monitoring'],
          parameters: [
            queryParam('bot', 'Filter by bot name (comma separated).'),
            queryParam('messageProvider', 'Filter by message provider (comma separated).'),
            queryParam('llmProvider', 'Filter by llm provider (comma separated).'),
            queryParam('from', 'ISO datetime start filter.'),
            queryParam('to', 'ISO datetime end filter.'),
          ],
          responses: {
            200: { description: 'Activity data' },
          },
        },
      },
      // Auth endpoints
      '/webui/api/auth/login': {
        post: {
          summary: 'User login',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                  required: ['username', 'password'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Authentication failed' },
          },
        },
      },
      '/webui/api/auth/register': {
        post: {
          summary: 'User registration (admin only)',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                  },
                  required: ['username', 'password', 'email'],
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered successfully' },
            400: { description: 'Registration failed' },
          },
        },
      },
      '/webui/api/auth/refresh': {
        post: {
          summary: 'Refresh access token',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Token refreshed successfully' },
            401: { description: 'Token refresh failed' },
          },
        },
      },
      '/webui/api/auth/logout': {
        post: {
          summary: 'User logout',
          tags: ['Authentication'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Logout successful' },
          },
        },
      },
      '/webui/api/auth/me': {
        get: {
          summary: 'Get current user profile',
          tags: ['Authentication'],
          responses: {
            200: { description: 'User profile data' },
          },
        },
      },
      '/webui/api/auth/password': {
        put: {
          summary: 'Change user password',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string' },
                  },
                  required: ['currentPassword', 'newPassword'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Password changed successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/webui/api/auth/users': {
        get: {
          summary: 'Get all users (admin only)',
          tags: ['Authentication'],
          responses: {
            200: { description: 'List of users' },
          },
        },
      },
      '/webui/api/auth/users/{userId}': {
        get: {
          summary: 'Get specific user (admin only)',
          tags: ['Authentication'],
          parameters: [pathParam('userId', 'User ID')],
          responses: {
            200: { description: 'User data' },
            404: { description: 'User not found' },
          },
        },
        put: {
          summary: 'Update user (admin only)',
          tags: ['Authentication'],
          parameters: [pathParam('userId', 'User ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'User updated successfully' },
            404: { description: 'User not found' },
          },
        },
        delete: {
          summary: 'Delete user (admin only)',
          tags: ['Authentication'],
          parameters: [pathParam('userId', 'User ID')],
          responses: {
            200: { description: 'User deleted successfully' },
            400: { description: 'Cannot delete own account' },
            404: { description: 'User not found' },
          },
        },
      },
      '/webui/api/auth/permissions': {
        get: {
          summary: 'Get current user permissions',
          tags: ['Authentication'],
          responses: {
            200: { description: 'User permissions data' },
          },
        },
      },
      // Agent endpoints
      '/api/agents': {
        get: {
          summary: 'Get all agents',
          tags: ['Agents'],
          responses: {
            200: { description: 'List of agents' },
          },
        },
        post: {
          summary: 'Create new agent',
          tags: ['Agents'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    messageProvider: { type: 'string' },
                    llmProvider: { type: 'string' },
                    persona: { type: 'string' },
                    systemInstruction: { type: 'string' },
                    mcpServers: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                  },
                  required: ['name', 'messageProvider', 'llmProvider'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Agent created successfully' },
          },
        },
      },
      '/api/agents/{id}': {
        put: {
          summary: 'Update agent',
          tags: ['Agents'],
          parameters: [pathParam('id', 'Agent ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    messageProvider: { type: 'string' },
                    llmProvider: { type: 'string' },
                    persona: { type: 'string' },
                    systemInstruction: { type: 'string' },
                    mcpServers: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Agent updated successfully' },
            404: { description: 'Agent not found' },
          },
        },
        delete: {
          summary: 'Delete agent',
          tags: ['Agents'],
          parameters: [pathParam('id', 'Agent ID')],
          responses: {
            200: { description: 'Agent deleted successfully' },
            404: { description: 'Agent not found' },
          },
        },
      },
      '/api/agents/personas': {
        get: {
          summary: 'Get all personas',
          tags: ['Agents'],
          responses: {
            200: { description: 'List of personas' },
          },
        },
        post: {
          summary: 'Create new persona',
          tags: ['Agents'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    systemPrompt: { type: 'string' },
                  },
                  required: ['name', 'systemPrompt'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Persona created successfully' },
            400: { description: 'Persona with this name already exists' },
          },
        },
      },
      '/api/agents/personas/{key}': {
        put: {
          summary: 'Update persona',
          tags: ['Agents'],
          parameters: [pathParam('key', 'Persona key')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    systemPrompt: { type: 'string' },
                  },
                  required: ['name', 'systemPrompt'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Persona updated successfully' },
            404: { description: 'Persona not found' },
          },
        },
        delete: {
          summary: 'Delete persona',
          tags: ['Agents'],
          parameters: [pathParam('key', 'Persona key')],
          responses: {
            200: { description: 'Persona deleted successfully' },
            400: { description: 'Cannot delete default persona' },
            404: { description: 'Persona not found' },
          },
        },
      },
      // MCP endpoints
      '/api/mcp/servers': {
        get: {
          summary: 'Get all MCP servers',
          tags: ['MCP'],
          responses: {
            200: { description: 'List of MCP servers' },
          },
        },
        post: {
          summary: 'Add new MCP server',
          tags: ['MCP'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' },
                    apiKey: { type: 'string' },
                  },
                  required: ['name', 'url'],
                },
              },
            },
          },
          responses: {
            200: { description: 'MCP server added successfully' },
            400: { description: 'MCP server with this name already exists' },
          },
        },
      },
      '/api/mcp/servers/{name}/connect': {
        post: {
          summary: 'Connect to MCP server',
          tags: ['MCP'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'Successfully connected to MCP server' },
            400: { description: 'MCP server already connected' },
            404: { description: 'MCP server not found' },
          },
        },
      },
      '/api/mcp/servers/{name}/disconnect': {
        post: {
          summary: 'Disconnect from MCP server',
          tags: ['MCP'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'Successfully disconnected from MCP server' },
          },
        },
      },
      '/api/mcp/servers/{name}': {
        delete: {
          summary: 'Remove MCP server',
          tags: ['MCP'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'MCP server removed successfully' },
            404: { description: 'MCP server not found' },
          },
        },
      },
      '/api/mcp/servers/{name}/tools': {
        get: {
          summary: 'Get tools from MCP server',
          tags: ['MCP'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'List of tools from MCP server' },
            404: { description: 'MCP server not connected' },
          },
        },
      },
      '/api/mcp/servers/{name}/call-tool': {
        post: {
          summary: 'Call a tool on MCP server',
          tags: ['MCP'],
          parameters: [pathParam('name', 'Server name')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    toolName: { type: 'string' },
                    arguments: { type: 'object' },
                  },
                  required: ['toolName'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Tool result' },
            400: { description: 'Tool name is required' },
            404: { description: 'MCP server not connected' },
          },
        },
      },
      '/api/mcp/connected': {
        get: {
          summary: 'Get all connected MCP servers',
          tags: ['MCP'],
          responses: {
            200: { description: 'List of connected MCP servers' },
          },
        },
      },
      '/api/mcp/providers': {
        get: {
          summary: 'Get all MCP providers',
          tags: ['MCP'],
          responses: {
            200: { description: 'List of MCP providers' },
          },
        },
        post: {
          summary: 'Create new MCP provider',
          tags: ['MCP'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['id', 'name', 'type', 'config'],
                },
              },
            },
          },
          responses: {
            201: { description: 'MCP provider created successfully' },
            400: { description: 'Invalid MCP provider configuration' },
          },
        },
      },
      '/api/mcp/providers/{id}': {
        get: {
          summary: 'Get MCP provider by ID',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'MCP provider data' },
            404: { description: 'MCP provider not found' },
          },
        },
        put: {
          summary: 'Update MCP provider',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'MCP provider updated successfully' },
            400: { description: 'Invalid MCP provider configuration' },
            404: { description: 'MCP provider not found' },
          },
        },
        delete: {
          summary: 'Delete MCP provider',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'MCP provider deleted successfully' },
            404: { description: 'MCP provider not found' },
          },
        },
      },
      '/api/mcp/providers/{id}/start': {
        post: {
          summary: 'Start MCP provider',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'MCP provider started successfully' },
            404: { description: 'MCP provider not found' },
          },
        },
      },
      '/api/mcp/providers/{id}/stop': {
        post: {
          summary: 'Stop MCP provider',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'MCP provider stopped successfully' },
            404: { description: 'MCP provider not found' },
          },
        },
      },
      '/api/mcp/providers/{id}/test': {
        post: {
          summary: 'Test MCP provider',
          tags: ['MCP'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'MCP provider test result' },
            404: { description: 'MCP provider not found' },
          },
        },
      },
      '/api/mcp/providers/templates': {
        get: {
          summary: 'Get MCP provider templates',
          tags: ['MCP'],
          responses: {
            200: { description: 'List of MCP provider templates' },
          },
        },
      },
      '/api/mcp/providers/stats': {
        get: {
          summary: 'Get MCP provider statistics',
          tags: ['MCP'],
          responses: {
            200: { description: 'MCP provider statistics' },
          },
        },
      },
      // Activity endpoints
      '/api/activity/messages': {
        get: {
          summary: 'Get filtered message activity',
          tags: ['Activity'],
          parameters: [
            queryParam('agentId', 'Filter by agent ID'),
            queryParam('messageProvider', 'Filter by message provider'),
            queryParam('llmProvider', 'Filter by LLM provider'),
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
            queryParam('limit', 'Limit results'),
            queryParam('offset', 'Offset for pagination'),
          ],
          responses: {
            200: { description: 'Message activity data' },
            503: { description: 'Database not connected' },
          },
        },
      },
      '/api/activity/llm-usage': {
        get: {
          summary: 'Get LLM usage metrics',
          tags: ['Activity'],
          parameters: [
            queryParam('llmProvider', 'Filter by LLM provider'),
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
            queryParam('limit', 'Limit results'),
          ],
          responses: {
            200: { description: 'LLM usage metrics' },
            503: { description: 'Database not connected' },
          },
        },
      },
      '/api/activity/summary': {
        get: {
          summary: 'Get activity summary',
          tags: ['Activity'],
          parameters: [
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
          ],
          responses: {
            200: { description: 'Activity summary' },
            503: { description: 'Database not connected' },
          },
        },
      },
      '/api/activity/chart-data': {
        get: {
          summary: 'Get time-series data for charts',
          tags: ['Activity'],
          parameters: [
            queryParam('messageProvider', 'Filter by message provider'),
            queryParam('llmProvider', 'Filter by LLM provider'),
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
            queryParam('interval', 'Interval: hour, day, week'),
          ],
          responses: {
            200: { description: 'Chart data' },
            503: { description: 'Database not connected' },
          },
        },
      },
      '/api/activity/agents': {
        get: {
          summary: 'Get agent activity statistics',
          tags: ['Activity'],
          parameters: [
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
          ],
          responses: {
            200: { description: 'Agent activity statistics' },
            503: { description: 'Database not connected' },
          },
        },
      },
      '/api/activity/mcp-tools': {
        get: {
          summary: 'Get MCP tool usage statistics',
          tags: ['Activity'],
          parameters: [
            queryParam('agentId', 'Filter by agent ID'),
            queryParam('startDate', 'ISO datetime start filter'),
            queryParam('endDate', 'ISO datetime end filter'),
          ],
          responses: {
            200: { description: 'MCP tool usage statistics' },
          },
        },
      },
      // Admin endpoints
      '/admin/tool-usage-guards': {
        get: {
          summary: 'Get tool usage guards',
          tags: ['Admin'],
          responses: {
            200: { description: 'List of tool usage guards' },
          },
        },
        post: {
          summary: 'Create a new tool usage guard',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    toolId: { type: 'string' },
                    guardType: { type: 'string', enum: ['owner_only', 'user_list', 'role_based'] },
                    allowedUsers: { type: 'array', items: { type: 'string' } },
                    allowedRoles: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                  },
                  required: ['name', 'toolId', 'guardType'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Tool usage guard created successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/admin/tool-usage-guards/{id}': {
        put: {
          summary: 'Update a tool usage guard',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Guard ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    toolId: { type: 'string' },
                    guardType: { type: 'string', enum: ['owner_only', 'user_list', 'role_based'] },
                    allowedUsers: { type: 'array', items: { type: 'string' } },
                    allowedRoles: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                  },
                  required: ['name', 'toolId', 'guardType'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Tool usage guard updated successfully' },
            400: { description: 'Validation error' },
          },
        },
        delete: {
          summary: 'Delete a tool usage guard',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Guard ID')],
          responses: {
            200: { description: 'Tool usage guard deleted successfully' },
          },
        },
      },
      '/admin/tool-usage-guards/{id}/toggle': {
        post: {
          summary: 'Toggle tool usage guard active status',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Guard ID')],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Tool usage guard status updated successfully' },
          },
        },
      },
      '/admin/llm-providers': {
        get: {
          summary: 'Get all LLM providers',
          tags: ['Admin'],
          responses: {
            200: { description: 'List of LLM providers' },
          },
        },
        post: {
          summary: 'Create a new LLM provider',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['name', 'type', 'config'],
                },
              },
            },
          },
          responses: {
            200: { description: 'LLM provider created successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/admin/llm-providers/{id}': {
        put: {
          summary: 'Update an LLM provider',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['name', 'type', 'config'],
                },
              },
            },
          },
          responses: {
            200: { description: 'LLM provider updated successfully' },
            400: { description: 'Validation error' },
          },
        },
        delete: {
          summary: 'Delete an LLM provider',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'LLM provider deleted successfully' },
          },
        },
      },
      '/admin/llm-providers/{id}/toggle': {
        post: {
          summary: 'Toggle LLM provider active status',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'LLM provider status updated successfully' },
            404: { description: 'Provider not found' },
          },
        },
      },
      '/admin/messenger-providers': {
        get: {
          summary: 'Get all messenger providers',
          tags: ['Admin'],
          responses: {
            200: { description: 'List of messenger providers' },
          },
        },
        post: {
          summary: 'Create a new messenger provider',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['name', 'type', 'config'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Messenger provider created successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/admin/messenger-providers/{id}': {
        put: {
          summary: 'Update a messenger provider',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    config: { type: 'object' },
                  },
                  required: ['name', 'type', 'config'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Messenger provider updated successfully' },
            400: { description: 'Validation error' },
          },
        },
        delete: {
          summary: 'Delete a messenger provider',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          responses: {
            200: { description: 'Messenger provider deleted successfully' },
          },
        },
      },
      '/admin/messenger-providers/{id}/toggle': {
        post: {
          summary: 'Toggle messenger provider active status',
          tags: ['Admin'],
          parameters: [pathParam('id', 'Provider ID')],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Messenger provider status updated successfully' },
            404: { description: 'Provider not found' },
          },
        },
      },
      '/admin/personas': {
        get: {
          summary: 'Get available personas',
          tags: ['Admin'],
          responses: {
            200: { description: 'List of personas' },
          },
        },
        post: {
          summary: 'Create a new persona',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    name: { type: 'string' },
                    systemPrompt: { type: 'string' },
                  },
                  required: ['key', 'name', 'systemPrompt'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Persona created successfully' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/admin/personas/{key}': {
        put: {
          summary: 'Update a persona',
          tags: ['Admin'],
          parameters: [pathParam('key', 'Persona key')],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    systemPrompt: { type: 'string' },
                  },
                  required: ['name', 'systemPrompt'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Persona updated successfully' },
            400: { description: 'Validation error' },
          },
        },
        delete: {
          summary: 'Delete a persona',
          tags: ['Admin'],
          parameters: [pathParam('key', 'Persona key')],
          responses: {
            200: { description: 'Persona deleted successfully' },
          },
        },
      },
      '/admin/mcp-servers/test': {
        post: {
          summary: 'Test connection to an MCP server',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    serverUrl: { type: 'string' },
                    apiKey: { type: 'string' },
                    name: { type: 'string' },
                  },
                  required: ['serverUrl'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Successfully tested connection' },
            400: { description: 'Validation error' },
            403: { description: 'Security warning - URL blocked' },
          },
        },
      },
      '/admin/mcp-servers/connect': {
        post: {
          summary: 'Connect to an MCP server',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    serverUrl: { type: 'string' },
                    apiKey: { type: 'string' },
                    name: { type: 'string' },
                  },
                  required: ['serverUrl', 'name'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Successfully connected' },
            400: { description: 'Validation error' },
            403: { description: 'Security warning - URL blocked' },
          },
        },
      },
      '/admin/mcp-servers/disconnect': {
        post: {
          summary: 'Disconnect from an MCP server',
          tags: ['Admin'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Successfully disconnected' },
            400: { description: 'Validation error' },
          },
        },
      },
      '/admin/mcp-servers/{name}': {
        delete: {
          summary: 'Delete an MCP server',
          tags: ['Admin'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'MCP server deleted successfully' },
          },
        },
      },
      '/admin/mcp-servers': {
        get: {
          summary: 'Get all connected MCP servers',
          tags: ['Admin'],
          responses: {
            200: { description: 'List of connected MCP servers' },
          },
        },
      },
      '/admin/mcp-servers/{name}/tools': {
        get: {
          summary: 'Get tools from a specific MCP server',
          tags: ['Admin'],
          parameters: [pathParam('name', 'Server name')],
          responses: {
            200: { description: 'List of tools' },
            404: { description: 'Server not found' },
          },
        },
      },
      '/admin/env-overrides': {
        get: {
          summary: 'Get environment variable overrides',
          tags: ['Admin'],
          responses: {
            200: { description: 'Environment variable overrides' },
          },
        },
      },
      '/admin/providers': {
        get: {
          summary: 'Get available providers',
          tags: ['Admin'],
          responses: {
            200: { description: 'Available message and LLM providers' },
          },
        },
      },
      '/admin/system-info': {
        get: {
          summary: 'Get system information',
          tags: ['Admin'],
          responses: {
            200: { description: 'System information' },
          },
        },
      },
    },
    tags: [
      { name: 'Configuration' },
      { name: 'Monitoring' },
      { name: 'Authentication' },
      { name: 'Agents' },
      { name: 'MCP' },
      { name: 'Activity' },
      { name: 'Admin' },
    ],
  };
}

function queryParam(name: string, description: string) {
  return {
    name,
    in: 'query' as const,
    required: false,
    schema: { type: 'string' },
    description,
  };
}

function pathParam(name: string, description: string) {
  return {
    name,
    in: 'path' as const,
    required: true,
    schema: { type: 'string' },
    description,
  };
}

function toYaml(value: unknown, indent = 0): string {
  const padding = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value
      .map((item) => {
        const rendered = toYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null) {
          const trimmed = rendered.trimStart();
          return `${padding}- ${trimmed.replace(/\n\s*/, '\n' + '  '.repeat(indent + 1))}`;
        }
        return `${padding}- ${rendered.trim()}`;
      })
      .join('\n');
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, val]) => {
        const rendered = toYaml(val, indent + 1);
        if (val && typeof val === 'object') {
          return `${padding}${key}:\n${rendered}`;
        }
        return `${padding}${key}: ${rendered}`;
      })
      .join('\n');
  }

  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('\n') || value.includes('#')) {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return value;
  }

  return String(value);
}

export default router;
