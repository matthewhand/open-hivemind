import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import fs from 'fs';
import path from 'path';
import { MCPService } from '../../mcp/MCPService';
import { webUIStorage } from '../../storage/webUIStorage';
import { getRelevantEnvVars, checkBotEnvOverrides } from '../../utils/envUtils';
import { DatabaseManager } from '../../database/DatabaseManager';
import Debug from 'debug';
import agentsRouter from './agents';
import mcpRouter from './mcp';
import activityRouter from './activity';

const router = Router();
const debug = Debug('app:webui:admin');

// Serve admin HTML page
router.get('/', (req: Request, res: Response) => {
  const adminHtmlPath = path.join(__dirname, '../views/admin.html');
  if (fs.existsSync(adminHtmlPath)) {
    res.sendFile(adminHtmlPath);
  } else {
    res.status(404).send('Admin panel not found');
  }
});

// Apply authentication middleware to all admin routes except the HTML page
router.use(authenticate, requireAdmin);

// Mount sub-routes
router.use('/agents', agentsRouter);
router.use('/mcp', mcpRouter);
router.use('/activity', activityRouter);

// Get available LLM providers
router.get('/api/admin/llm-providers', (req: Request, res: Response) => {
  try {
    // These are the supported LLM providers based on the codebase analysis
    const providers = ['openai', 'flowise', 'openwebui'];
    
    res.json({
      success: true,
      data: { providers },
      message: 'LLM providers retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve LLM providers',
      message: error.message || 'An error occurred while retrieving LLM providers'
    });
  }
});

// Get available messenger providers
router.get('/api/admin/messenger-providers', (req: Request, res: Response) => {
  try {
    // These are the supported messenger providers based on the codebase analysis
    const providers = ['discord', 'slack', 'mattermost'];
    
    res.json({
      success: true,
      data: { providers },
      message: 'Messenger providers retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve messenger providers',
      message: error.message || 'An error occurred while retrieving messenger providers'
    });
  }
});

// Get available personas
router.get('/api/admin/personas', (req: Request, res: Response) => {
  try {
    // Get personas from persistent storage
    const storedPersonas = webUIStorage.getPersonas();
    
    // Default personas - in a real implementation, these would be stored in a database
    const defaultPersonas = [
      {
        key: 'default',
        name: 'Default Assistant',
        systemPrompt: 'You are a helpful AI assistant.'
      },
      {
        key: 'developer',
        name: 'Developer Assistant',
        systemPrompt: 'You are an expert software developer assistant.'
      },
      {
        key: 'support',
        name: 'Support Agent',
        systemPrompt: 'You are a customer support agent.'
      }
    ];
    
    // Combine stored and default personas
    const allPersonas = [...storedPersonas, ...defaultPersonas];
    
    res.json({
      success: true,
      data: { personas: allPersonas },
      message: 'Personas retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve personas',
      message: error.message || 'An error occurred while retrieving personas'
    });
  }
});

// Save a new persona
router.post('/api/admin/personas', (req: Request, res: Response) => {
  try {
    const { key, name, systemPrompt } = req.body;
    
    // Validation
    if (!key || !name || !systemPrompt) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Key, name, and systemPrompt are required'
      });
    }
    
    // Save to persistent storage
    webUIStorage.savePersona({ key, name, systemPrompt });
    
    res.json({
      success: true,
      message: 'Persona created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to create persona',
      message: error.message || 'An error occurred while creating persona'
    });
  }
});

// Update an existing persona
router.put('/api/admin/personas/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { name, systemPrompt } = req.body;
    
    // Validation
    if (!name || !systemPrompt) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and systemPrompt are required'
      });
    }
    
    // Save to persistent storage
    webUIStorage.savePersona({ key, name, systemPrompt });
    
    res.json({
      success: true,
      message: 'Persona updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update persona',
      message: error.message || 'An error occurred while updating persona'
    });
  }
});

// Delete a persona
router.delete('/api/admin/personas/:key', (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    // Delete from persistent storage
    webUIStorage.deletePersona(key);
    
    res.json({
      success: true,
      message: 'Persona deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete persona',
      message: error.message || 'An error occurred while deleting persona'
    });
  }
});

// Connect to an MCP server
router.post('/api/admin/mcp-servers/connect', async (req: Request, res: Response) => {
  try {
    const { serverUrl, apiKey, name } = req.body;
    
    // Validation
    if (!serverUrl || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Server URL and name are required'
      });
    }
    
    const mcpService = MCPService.getInstance();
    const tools = await mcpService.connectToServer({ serverUrl, apiKey, name });
    
    // Save to persistent storage
    webUIStorage.saveMcp({ name, serverUrl, apiKey });
    
    res.json({
      success: true,
      data: { tools },
      message: `Successfully connected to MCP server: ${name}`
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to connect to MCP server',
      message: error.message || 'An error occurred while connecting to MCP server'
    });
  }
});

// Disconnect from an MCP server
router.post('/api/admin/mcp-servers/disconnect', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Server name is required'
      });
    }
    
    const mcpService = MCPService.getInstance();
    await mcpService.disconnectFromServer(name);
    
    // Remove from persistent storage
    webUIStorage.deleteMcp(name);
    
    res.json({
      success: true,
      message: `Successfully disconnected from MCP server: ${name}`
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to disconnect from MCP server',
      message: error.message || 'An error occurred while disconnecting from MCP server'
    });
  }
});

// Get all connected MCP servers
router.get('/api/admin/mcp-servers', (req: Request, res: Response) => {
  try {
    const mcpService = MCPService.getInstance();
    const servers = mcpService.getConnectedServers();
    
    // Get stored MCP server configurations
    const storedMcps = webUIStorage.getMcps();
    
    res.json({
      success: true,
      data: { servers, configurations: storedMcps },
      message: 'Connected MCP servers retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve MCP servers',
      message: error.message || 'An error occurred while retrieving MCP servers'
    });
  }
});

// Get tools from a specific MCP server
router.get('/api/admin/mcp-servers/:name/tools', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    const mcpService = MCPService.getInstance();
    const tools = mcpService.getToolsFromServer(name);
    
    if (!tools) {
      return res.status(404).json({
        error: 'Server not found',
        message: `MCP server ${name} not found or not connected`
      });
    }
    
    res.json({
      success: true,
      data: { tools },
      message: `Tools retrieved successfully from MCP server: ${name}`
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve tools',
      message: error.message || 'An error occurred while retrieving tools'
    });
  }
});

// Get environment variable overrides
router.get('/api/admin/env-overrides', (req: Request, res: Response) => {
  try {
    const envVars = getRelevantEnvVars();
    
    res.json({
      success: true,
      data: { envVars },
      message: 'Environment variable overrides retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve environment variable overrides',
      message: error.message || 'An error occurred while retrieving environment variable overrides'
    });
  }
});

// Get activity monitoring data
router.get('/api/admin/activity/messages', (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from WebSocketService or database
    // For now, we'll return mock data
    const messages: any[] = [];
    
    res.json({
      success: true,
      data: { messages },
      message: 'Activity messages retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve activity messages',
      message: error.message || 'An error occurred while retrieving activity messages'
    });
  }
});

// Get performance metrics
router.get('/api/admin/activity/metrics', (req: Request, res: Response) => {
  try {
    // In a real implementation, this would fetch from WebSocketService or database
    // For now, we'll return mock data
    const metrics: any[] = [];
    
    res.json({
      success: true,
      data: { metrics },
      message: 'Performance metrics retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve performance metrics',
      message: error.message || 'An error occurred while retrieving performance metrics'
    });
  }
});

// GET /api/admin/env-overrides - Get environment variable overrides
router.get('/env-overrides', async (req: Request, res: Response) => {
  try {
    const envOverrides: Record<string, string> = {};
    
    // Check for common environment variables that might override config
    const envVarPatterns = [
      /^DISCORD_/,
      /^SLACK_/,
      /^TELEGRAM_/,
      /^MATTERMOST_/,
      /^OPENAI_/,
      /^FLOWISE_/,
      /^OPENWEBUI_/,
      /^MCP_/,
      /^BOT_/,
      /^AGENT_/
    ];

    Object.keys(process.env).forEach(key => {
      if (envVarPatterns.some(pattern => pattern.test(key))) {
        const value = process.env[key];
        if (value) {
          // Redact sensitive values
          if (key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('key') || 
              key.toLowerCase().includes('secret')) {
            envOverrides[key] = `***${value.slice(-4)}`;
          } else if (value.length > 20) {
            envOverrides[key] = `${value.slice(0, 10)}...${value.slice(-4)}`;
          } else {
            envOverrides[key] = value;
          }
        }
      }
    });

    res.json({ envVars: envOverrides });
  } catch (error) {
    debug('Error fetching environment overrides:', error);
    res.status(500).json({ error: 'Failed to fetch environment overrides' });
  }
});

// GET /api/admin/providers - Get available providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const messageProviders = [
      { 
        id: 'discord', 
        name: 'Discord', 
        description: 'Discord bot integration',
        configRequired: ['token'],
        envVarPrefix: 'DISCORD_'
      },
      { 
        id: 'slack', 
        name: 'Slack', 
        description: 'Slack bot integration',
        configRequired: ['botToken', 'appToken'],
        envVarPrefix: 'SLACK_'
      },
      { 
        id: 'telegram', 
        name: 'Telegram', 
        description: 'Telegram bot integration',
        configRequired: ['token'],
        envVarPrefix: 'TELEGRAM_'
      },
      { 
        id: 'mattermost', 
        name: 'Mattermost', 
        description: 'Mattermost bot integration',
        configRequired: ['token', 'serverUrl'],
        envVarPrefix: 'MATTERMOST_'
      }
    ];

    const llmProviders = [
      { 
        id: 'openai', 
        name: 'OpenAI', 
        description: 'OpenAI GPT models',
        configRequired: ['apiKey'],
        envVarPrefix: 'OPENAI_'
      },
      { 
        id: 'flowise', 
        name: 'Flowise', 
        description: 'Flowise workflow engine',
        configRequired: ['baseUrl'],
        envVarPrefix: 'FLOWISE_'
      },
      { 
        id: 'openwebui', 
        name: 'Open WebUI', 
        description: 'Open WebUI local models',
        configRequired: ['baseUrl'],
        envVarPrefix: 'OPENWEBUI_'
      }
    ];

    res.json({ 
      messageProviders, 
      llmProviders 
    });
  } catch (error) {
    debug('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// GET /api/admin/system-info - Get system information
router.get('/system-info', async (req: Request, res: Response) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      database: {
        connected: dbManager.isConnected(),
        stats: dbManager.isConnected() ? await dbManager.getStats() : null
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({ systemInfo });
  } catch (error) {
    debug('Error fetching system info:', error);
    res.status(500).json({ error: 'Failed to fetch system info' });
  }
});

export default router;