import { rest } from 'msw';
import { ConfigResponse, StatusResponse, ConfigSourcesResponse, SecureConfig, ActivityResponse, Bot } from '../services/api';

// Mock data for different API endpoints
const mockConfig: ConfigResponse = {
  bots: [
    {
      name: 'test-bot-1',
      messageProvider: 'discord',
      llmProvider: 'openai',
      persona: 'default',
      systemInstruction: 'You are a helpful assistant',
      mcpServers: [],
      mcpGuard: {
        enabled: false,
        type: 'owner'
      }
    },
    {
      name: 'test-bot-2',
      messageProvider: 'slack',
      llmProvider: 'openai',
      persona: 'support',
      systemInstruction: 'You are a support assistant',
      mcpServers: [],
      mcpGuard: {
        enabled: true,
        type: 'custom',
        allowedUserIds: ['user123']
      }
    }
 ],
  warnings: [],
  legacyMode: false,
  environment: 'development'
};

const mockStatus: StatusResponse = {
  bots: [
    {
      name: 'test-bot-1',
      provider: 'discord',
      llmProvider: 'openai',
      status: 'online',
      connected: true,
      messageCount: 150,
      errorCount: 2
    },
    {
      name: 'test-bot-2',
      provider: 'slack',
      llmProvider: 'openai',
      status: 'offline',
      connected: false,
      messageCount: 85,
      errorCount: 5
    }
  ],
  uptime: 3600
};

const mockConfigSources: ConfigSourcesResponse = {
  environmentVariables: {
    'NODE_ENV': 'development',
    'PORT': '3000'
  },
  configFiles: [
    {
      path: 'config/default.json',
      content: {}
    }
  ],
  overrides: []
};

const mockSecureConfigs: SecureConfig[] = [
  {
    id: '1',
    name: 'discord-tokens',
    data: {
      token: 'mock_discord_token'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    encrypted: true
 },
  {
    id: '2',
    name: 'api-keys',
    data: {
      openai: 'mock_openai_key'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    encrypted: true
  }
];

const mockActivity: ActivityResponse = {
  events: [
    {
      id: 'event-1',
      timestamp: '2024-01-01T10:00:00Z',
      botName: 'test-bot-1',
      provider: 'discord',
      llmProvider: 'openai',
      channelId: 'channel-1',
      userId: 'user-1',
      messageType: 'incoming',
      contentLength: 50,
      processingTime: 120,
      status: 'success'
    }
  ],
  filters: {
    agents: ['test-bot-1', 'test-bot-2'],
    messageProviders: ['discord', 'slack'],
    llmProviders: ['openai']
  },
  timeline: [
    {
      timestamp: '2024-01-01T10:00:00Z',
      messageProviders: { discord: 10, slack: 5 },
      llmProviders: { openai: 15 }
    }
  ],
  agentMetrics: [
    {
      botName: 'test-bot-1',
      messageProvider: 'discord',
      llmProvider: 'openai',
      events: 150,
      errors: 2,
      lastActivity: '2024-01-01T10:00:00Z',
      totalMessages: 148,
      recentErrors: []
    }
  ]
};

// Common error responses
const errorResponse = (message: string, status: number = 500) => ({
  status,
  json: { message }
});

// Handlers for all WebUI API endpoints
export const handlers = [
  // Config endpoints
  rest.get('/webui/api/config', (req, res, ctx) => {
    return res(ctx.json(mockConfig));
  }),

  rest.post('/webui/api/config/reload', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Configuration reloaded successfully', 
      timestamp: new Date().toISOString() 
    }));
  }),

  rest.get('/webui/api/config/sources', (req, res, ctx) => {
    return res(ctx.json(mockConfigSources));
  }),

  // Bot management endpoints
  rest.get('/webui/api/bots', (req, res, ctx) => {
    return res(ctx.json({ bots: mockConfig.bots }));
  }),

  rest.post('/webui/api/bots', async (req, res, ctx) => {
    const newBot = await req.json();
    const bot: Bot = {
      ...newBot,
      name: newBot.name || `bot-${Date.now()}`,
      mcpServers: newBot.mcpServers || [],
      mcpGuard: newBot.mcpGuard || { enabled: false, type: 'owner' }
    };
    
    return res(ctx.json({ 
      success: true, 
      message: 'Bot created successfully', 
      bot 
    }));
 }),

  rest.put('/webui/api/bots/:botId', async (req, res, ctx) => {
    const botId = req.params.botId as string;
    const updates = await req.json();
    
    const updatedBot: Bot = {
      ...mockConfig.bots.find(b => b.name === botId) || {
        name: botId,
        messageProvider: 'discord',
        llmProvider: 'openai',
        mcpServers: [],
        mcpGuard: { enabled: false, type: 'owner' }
      },
      ...updates
    };
    
    return res(ctx.json({ 
      success: true, 
      message: 'Bot updated successfully', 
      bot: updatedBot 
    }));
 }),

  rest.delete('/webui/api/bots/:botId', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Bot deleted successfully' 
    }));
  }),

  rest.post('/webui/api/bots/:botId/clone', async (req, res, ctx) => {
    const botId = req.params.botId as string;
    const { newName } = await req.json();
    
    const originalBot = mockConfig.bots.find(b => b.name === botId);
    if (!originalBot) {
      return res(errorResponse('Bot not found', 404));
    }
    
    const clonedBot: Bot = {
      ...originalBot,
      name: newName,
      mcpServers: originalBot.mcpServers ? [...originalBot.mcpServers] : []
    };
    
    return res(ctx.json({ 
      success: true, 
      message: 'Bot cloned successfully', 
      bot: clonedBot 
    }));
 }),

  // Status endpoints
  rest.get('/dashboard/api/status', (req, res, ctx) => {
    return res(ctx.json(mockStatus));
  }),

  // Activity endpoints
  rest.get('/dashboard/api/activity', (req, res, ctx) => {
    // Handle query parameters for filtering
    const bot = req.url.searchParams.get('bot');
    const messageProvider = req.url.searchParams.get('messageProvider');
    const llmProvider = req.url.searchParams.get('llmProvider');
    
    let filteredEvents = [...mockActivity.events];
    
    if (bot) {
      filteredEvents = filteredEvents.filter(e => e.botName === bot);
    }
    if (messageProvider) {
      filteredEvents = filteredEvents.filter(e => e.provider === messageProvider);
    }
    if (llmProvider) {
      filteredEvents = filteredEvents.filter(e => e.llmProvider === llmProvider);
    }
    
    return res(ctx.json({
      ...mockActivity,
      events: filteredEvents
    }));
  }),

  // Secure config endpoints
  rest.get('/webui/api/secure-configs', (req, res, ctx) => {
    return res(ctx.json({ configs: mockSecureConfigs }));
  }),

  rest.get('/webui/api/secure-configs/:name', (req, res, ctx) => {
    const name = req.params.name as string;
    const config = mockSecureConfigs.find(c => c.name === name);
    
    if (!config) {
      return res(errorResponse('Config not found', 404));
    }
    
    return res(ctx.json({ config }));
  }),

  rest.post('/webui/api/secure-configs', async (req, res, ctx) => {
    const { name, data } = await req.json();
    
    const newConfig: SecureConfig = {
      id: `config-${Date.now()}`,
      name,
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      encrypted: true
    };
    
    return res(ctx.json({ 
      success: true, 
      message: 'Secure config saved successfully', 
      config: newConfig 
    }));
  }),

  rest.delete('/webui/api/secure-configs/:name', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Secure config deleted successfully' 
    }));
  }),

  rest.post('/webui/api/secure-configs/backup', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Backup created successfully', 
      backupFile: 'backup-2024-01-01.json' 
    }));
  }),

  rest.post('/webui/api/secure-configs/restore', async (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Configuration restored successfully' 
    }));
  }),

  rest.get('/webui/api/secure-configs/info', (req, res, ctx) => {
    return res(ctx.json({
      configDirectory: '/tmp/secure-configs',
      totalConfigs: mockSecureConfigs.length,
      directorySize: 1024,
      lastModified: new Date().toISOString()
    }));
  }),

  // Cache endpoints
  rest.post('/webui/api/cache/clear', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      message: 'Cache cleared successfully' 
    }));
  }),

  // Export endpoint
  rest.get('/webui/api/config/export', (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', 'application/json'),
      ctx.set('Content-Disposition', 'attachment; filename="config.json"'),
      ctx.body(JSON.stringify(mockConfig, null, 2))
    );
  }),

  // API monitoring endpoints
  rest.get('/health/api-endpoints', (req, res, ctx) => {
    return res(ctx.json({
      overall: {
        status: 'healthy',
        message: 'All endpoints are responding normally',
        stats: {
          total: 5,
          online: 4,
          slow: 1,
          offline: 0,
          error: 0
        }
      },
      endpoints: [
        {
          id: 'health-check',
          name: 'Health Check',
          url: '/health',
          status: 'online',
          responseTime: 50,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 98,
          averageResponseTime: 45,
          statusCode: 200
        },
        {
          id: 'api-status',
          name: 'API Status',
          url: '/dashboard/api/status',
          status: 'online',
          responseTime: 65,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 10,
          averageResponseTime: 60,
          statusCode: 200
        },
        {
          id: 'config-api',
          name: 'Config API',
          url: '/webui/api/config',
          status: 'slow',
          responseTime: 2500,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 95,
          averageResponseTime: 1200,
          statusCode: 200
        },
        {
          id: 'activity-api',
          name: 'Activity API',
          url: '/dashboard/api/activity',
          status: 'online',
          responseTime: 80,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 99,
          averageResponseTime: 75,
          statusCode: 200
        },
        {
          id: 'webhook-endpoint',
          name: 'Webhook Endpoint',
          url: '/webhooks/incoming',
          status: 'online',
          responseTime: 45,
          lastChecked: new Date().toISOString(),
          lastSuccessfulCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          totalChecks: 100,
          successfulChecks: 100,
          averageResponseTime: 42,
          statusCode: 200
        }
      ],
      timestamp: new Date().toISOString()
    }));
  }),

  rest.get('/health/api-endpoints/:id', (req, res, ctx) => {
    const id = req.params.id as string;
    const endpoint = {
      id,
      name: `${id.replace(/-/g, ' ')} endpoint`,
      url: `/${id.replace(/-/g, '/')}`,
      status: 'online',
      responseTime: 100,
      lastChecked: new Date().toISOString(),
      lastSuccessfulCheck: new Date().toISOString(),
      consecutiveFailures: 0,
      totalChecks: 50,
      successfulChecks: 48,
      averageResponseTime: 95,
      statusCode: 200
    };
    
    return res(ctx.json({
      endpoint,
      timestamp: new Date().toISOString()
    }));
  }),

  rest.post('/health/api-endpoints', async (req, res, ctx) => {
    const config = await req.json();
    
    return res(ctx.json({
      message: 'API endpoint added successfully',
      endpoint: config,
      timestamp: new Date().toISOString()
    }));
  }),

  rest.put('/health/api-endpoints/:id', async (req, res, ctx) => {
    const id = req.params.id as string;
    const config = await req.json();
    
    return res(ctx.json({
      message: 'API endpoint updated successfully',
      endpoint: { id, ...config },
      timestamp: new Date().toISOString()
    }));
  }),

  rest.delete('/health/api-endpoints/:id', (req, res, ctx) => {
    const id = req.params.id as string;
    
    return res(ctx.json({
      message: 'API endpoint removed successfully',
      removedEndpoint: { id },
      timestamp: new Date().toISOString()
    }));
  }),

  rest.post('/health/api-endpoints/start', (req, res, ctx) => {
    return res(ctx.json({
      message: 'API monitoring started successfully',
      timestamp: new Date().toISOString()
    }));
  }),

  rest.post('/health/api-endpoints/stop', (req, res, ctx) => {
    return res(ctx.json({
      message: 'API monitoring stopped successfully',
      timestamp: new Date().toISOString()
    }));
  }),

  // System health endpoint
  rest.get('/health/detailed', (req, res, ctx) => {
    return res(ctx.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      memory: {
        used: 100 * 1024 * 1024, // 100 MB
        total: 2 * 1024 * 1024 * 1024, // 2 GB
        usage: 0.05 // 5%
      },
      cpu: {
        user: 10,
        system: 5
      },
      system: {
        platform: 'linux',
        arch: 'x64',
        release: '5.4.0',
        hostname: 'test-server',
        loadAverage: [0.1, 0.2, 0.3]
      }
    }));
  }),

  // Admin API endpoints
  rest.get('/api/admin/personas', (req, res, ctx) => {
    return res(ctx.json([
      {
        key: 'default',
        name: 'Default Persona',
        systemPrompt: 'You are a helpful assistant'
      },
      {
        key: 'support',
        name: 'Support Persona',
        systemPrompt: 'You are a customer support agent'
      }
    ]));
 }),

  rest.post('/api/admin/personas', async (req, res, ctx) => {
    const persona = await req.json();
    return res(ctx.json({ 
      success: true, 
      message: 'Persona created successfully',
      persona 
    }));
 }),

  rest.put('/api/admin/personas/:key', async (req, res, ctx) => {
    const key = req.params.key as string;
    const updates = await req.json();
    return res(ctx.json({ 
      success: true, 
      message: 'Persona updated successfully',
      persona: { key, ...updates }
    }));
  }),

  rest.delete('/api/admin/personas/:key', (req, res, ctx) => {
    const key = req.params.key as string;
    return res(ctx.json({ 
      success: true, 
      message: 'Persona deleted successfully' 
    }));
  }),

  rest.get('/api/admin/agents', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 'agent-1',
        name: 'Test Agent 1',
        enabled: true,
        status: 'running',
        lastActivity: new Date().toISOString()
      },
      {
        id: 'agent-2',
        name: 'Test Agent 2',
        enabled: false,
        status: 'stopped',
        lastActivity: new Date().toISOString()
      }
    ]));
  }),

  rest.post('/api/admin/agents', async (req, res, ctx) => {
    const agent = await req.json();
    return res(ctx.json({ 
      success: true, 
      message: 'Agent created successfully',
      agent: { id: `agent-${Date.now()}`, ...agent, status: 'stopped' }
    }));
  }),

  rest.put('/api/admin/agents/:agentId', async (req, res, ctx) => {
    const agentId = req.params.agentId as string;
    const updates = await req.json();
    return res(ctx.json({ 
      success: true, 
      message: 'Agent updated successfully',
      agent: { id: agentId, ...updates }
    }));
  }),

  rest.delete('/api/admin/agents/:agentId', (req, res, ctx) => {
    const agentId = req.params.agentId as string;
    return res(ctx.json({ 
      success: true, 
      message: 'Agent deleted successfully' 
    }));
  }),

  rest.get('/api/admin/mcp/servers', (req, res, ctx) => {
    return res(ctx.json([
      {
        name: 'test-mcp-server',
        url: 'http://localhost:8080',
        connected: true
      }
    ]));
  }),

  rest.post('/api/admin/mcp/servers', async (req, res, ctx) => {
    const server = await req.json();
    return res(ctx.json({ 
      success: true, 
      message: 'MCP server added successfully',
      server 
    }));
  }),

  rest.post('/api/admin/mcp/servers/:serverName/connect', (req, res, ctx) => {
    const serverName = req.params.serverName as string;
    return res(ctx.json({ 
      success: true, 
      message: `MCP server ${serverName} connected successfully` 
    }));
  }),

  rest.post('/api/admin/mcp/servers/:serverName/disconnect', (req, res, ctx) => {
    const serverName = req.params.serverName as string;
    return res(ctx.json({ 
      success: true, 
      message: `MCP server ${serverName} disconnected successfully` 
    }));
  }),

  rest.delete('/api/admin/mcp/servers/:serverName', (req, res, ctx) => {
    const serverName = req.params.serverName as string;
    return res(ctx.json({ 
      success: true, 
      message: `MCP server ${serverName} deleted successfully` 
    }));
  }),

  // Authentication endpoints
  rest.post('/api/auth/admin/login', async (req, res, ctx) => {
    const credentials = await req.json();
    if (credentials.username === 'admin' && credentials.password === 'password') {
      return res(ctx.json({ 
        success: true, 
        token: 'mock-jwt-token',
        user: { username: 'admin', role: 'admin' }
      }));
    } else {
      return res(errorResponse('Invalid credentials', 401));
    }
  }),

  rest.post('/webui/api/auth/login', async (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      token: 'mock-webui-token',
      user: { username: 'user', role: 'user' }
    }));
  }),

  rest.post('/webui/api/auth/refresh', (req, res, ctx) => {
    return res(ctx.json({ 
      success: true, 
      token: 'new-mock-token' 
    }));
 }),

  rest.post('/webui/api/auth/verify', (req, res, ctx) => {
    return res(ctx.json({ 
      valid: true,
      user: { username: 'user', role: 'user' }
    }));
 }),

  // Error scenario handlers
  rest.get('/webui/api/config-error', (req, res, ctx) => {
    return res(errorResponse('Configuration API error', 500));
  }),

  rest.get('/webui/api/timeout', (req, res, ctx) => {
    // Simulate a timeout by taking longer than the client timeout
    return res(ctx.delay(1000), errorResponse('Request timeout', 408));
  }),

  // Hot reload endpoints
  rest.post('/webui/api/config/hot-reload', async (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Configuration applied successfully',
      affectedBots: ['test-bot-1'],
      warnings: [],
      errors: []
    }));
  }),

  rest.get('/webui/api/config/hot-reload/status', (req, res, ctx) => {
    return res(ctx.json({
      status: 'idle',
      lastApplied: new Date().toISOString(),
      pendingChanges: 0
    }));
  }),

  rest.get('/webui/api/config/hot-reload/history', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 'history-1',
        timestamp: new Date().toISOString(),
        changes: ['bot update'],
        status: 'success',
        appliedBy: 'admin'
      }
    ]));
  }),

  rest.get('/webui/api/config/hot-reload/rollbacks', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 'rollback-1',
        timestamp: new Date().toISOString(),
        reason: 'Configuration error',
        appliedBy: 'system'
      }
    ]));
  }),

  rest.post('/webui/api/config/hot-reload/rollback/:snapshotId', (req, res, ctx) => {
    const snapshotId = req.params.snapshotId as string;
    return res(ctx.json({
      success: true,
      message: `Rollback to ${snapshotId} completed successfully`,
      appliedChanges: ['bot update']
    }));
  })
];