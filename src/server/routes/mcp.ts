import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import MCPProviderManager from '../../config/MCPProviderManager';
import type { MCPProviderConfig } from '../../types/mcp';
import { requireRole } from '../middleware/auth';

const debug = Debug('app:webui:mcp');
const router = Router();

// Initialize MCP Provider Manager (using singleton instance)
const mcpProviderManager = MCPProviderManager;

interface MCPServer {
  name: string;
  url: string;
  apiKey?: string;
  connected: boolean;
  tools?: {
    name: string;
    description: string;
    inputSchema: any;
  }[];
  lastConnected?: string;
  error?: string;
}

interface MCPClient {
  client: Client;
  transport: StdioClientTransport;
  server: MCPServer;
}

const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

// In-memory store for connected MCP clients
const connectedClients = new Map<string, MCPClient>();

// Ensure data directory exists
const ensureDataDir = async () => {
  const dataDir = join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug('Error creating data directory:', hivemindError.message);
  }
};

// Load/Save MCP server configurations
const loadMCPServers = async (): Promise<MCPServer[]> => {
  try {
    const data = await fs.readFile(MCP_SERVERS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug('MCP servers config file not found, using defaults:', hivemindError.message);
    return [];
  }
};

const saveMCPServers = async (servers: MCPServer[]): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(MCP_SERVERS_CONFIG_FILE, JSON.stringify(servers, null, 2));
};

// Connect to MCP server
const connectToMCPServer = async (server: MCPServer): Promise<MCPClient> => {
  try {
    debug(`Connecting to MCP server: ${server.name} at ${server.url}`);

    // For stdio transport (local MCP servers)
    if (server.url.startsWith('stdio://')) {
      const command = server.url.replace('stdio://', '');
      const transport = new StdioClientTransport({
        command: command,
        args: [],
      });

      const client = new Client(
        {
          name: `hivemind-${server.name}`,
          version: '1.0.0',
        },
        {
          capabilities: {
            experimental: {},
          },
        }
      );

      await client.connect(transport);

      // Get available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
      }));

      const mcpClient: MCPClient = {
        client,
        transport,
        server: {
          ...server,
          connected: true,
          tools,
          lastConnected: new Date().toISOString(),
          error: undefined,
        },
      };

      connectedClients.set(server.name, mcpClient);
      debug(`Successfully connected to MCP server: ${server.name}`);

      return mcpClient;
    } else {
      throw new Error(`Unsupported MCP server URL scheme: ${server.url}`);
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug(`Failed to connect to MCP server ${server.name}:`, hivemindError.message);
    throw hivemindError;
  }
};

// Disconnect from MCP server
const disconnectFromMCPServer = async (serverName: string): Promise<void> => {
  try {
    const mcpClient = connectedClients.get(serverName);
    if (mcpClient) {
      await mcpClient.client.close();
      connectedClients.delete(serverName);
      debug(`Disconnected from MCP server: ${serverName}`);
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug(`Error disconnecting from MCP server ${serverName}:`, hivemindError.message);
    throw hivemindError;
  }
};

// Routes

// GET /api/mcp/servers - Get all MCP servers
router.get('/servers', async (req, res) => {
  try {
    const servers = await loadMCPServers();

    // Update connection status based on active clients
    const updatedServers = servers.map((server) => ({
      ...server,
      connected: connectedClients.has(server.name),
      tools: connectedClients.get(server.name)?.server.tools || server.tools,
    }));

    return res.json({ servers: updatedServers });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching MCP servers:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVERS_FETCH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/servers - Add new MCP server
router.post('/servers', requireRole('admin'), async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const servers = await loadMCPServers();

    // Check if server already exists
    if (servers.find((s) => s.name === name)) {
      return res.status(400).json({ error: 'MCP server with this name already exists' });
    }

    const newServer: MCPServer = {
      name,
      url,
      apiKey,
      connected: false,
    };

    servers.push(newServer);
    await saveMCPServers(servers);

    debug(`Added new MCP server: ${name}`);
    return res.json({ server: newServer });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error adding MCP server:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVER_ADD_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/servers/:name/connect - Connect to MCP server
router.post('/servers/:name/connect', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.params;

    const servers = await loadMCPServers();
    const server = servers.find((s) => s.name === name);

    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    if (connectedClients.has(name)) {
      return res.status(400).json({ error: 'MCP server already connected' });
    }

    try {
      const mcpClient = await connectToMCPServer(server);

      // Update server config with connection info
      const serverIndex = servers.findIndex((s) => s.name === name);
      servers[serverIndex] = mcpClient.server;
      await saveMCPServers(servers);

      return res.json({
        server: mcpClient.server,
        message: 'Successfully connected to MCP server',
      });
    } catch (error) {
      // Update server config with error
      const serverIndex = servers.findIndex((s) => s.name === name);
      servers[serverIndex] = {
        ...server,
        connected: false,
        error: String(error),
      };
      await saveMCPServers(servers);

      return res.status(500).json({ error: `Failed to connect to MCP server: ${error}` });
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error connecting to MCP server:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVER_CONNECT_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/servers/:name/disconnect - Disconnect from MCP server
router.post('/servers/:name/disconnect', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.params;

    await disconnectFromMCPServer(name);

    // Update server config
    const servers = await loadMCPServers();
    const serverIndex = servers.findIndex((s) => s.name === name);

    if (serverIndex !== -1) {
      servers[serverIndex] = {
        ...servers[serverIndex],
        connected: false,
        error: undefined,
      };
      await saveMCPServers(servers);
    }

    return res.json({ message: 'Successfully disconnected from MCP server' });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error disconnecting from MCP server:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVER_DISCONNECT_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/mcp/servers/:name - Remove MCP server
router.delete('/servers/:name', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.params;

    // Disconnect if connected
    if (connectedClients.has(name)) {
      await disconnectFromMCPServer(name);
    }

    const servers = await loadMCPServers();
    const filteredServers = servers.filter((s) => s.name !== name);

    if (filteredServers.length === servers.length) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    await saveMCPServers(filteredServers);

    debug(`Removed MCP server: ${name}`);
    return res.json({ success: true });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error removing MCP server:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVER_REMOVE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/mcp/servers/:name/tools - Get tools from MCP server
router.get('/servers/:name/tools', async (req, res) => {
  try {
    const { name } = req.params;

    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(404).json({ error: 'MCP server not connected' });
    }

    const toolsResponse = await mcpClient.client.listTools();
    const tools = toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema,
    }));

    return res.json({ tools });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching MCP server tools:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_SERVER_TOOLS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/servers/:name/call-tool - Call a tool on MCP server
router.post('/servers/:name/call-tool', requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.params;
    const { toolName, arguments: toolArgs } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(404).json({ error: 'MCP server not connected' });
    }

    const result = await mcpClient.client.callTool({
      name: toolName,
      arguments: toolArgs || {},
    });

    return res.json({ result });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error calling MCP tool:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_TOOL_CALL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/mcp/connected - Get all connected MCP servers
router.get('/connected', async (req, res) => {
  try {
    const connected = Array.from(connectedClients.values()).map((client) => ({
      name: client.server.name,
      url: client.server.url,
      toolCount: client.server.tools?.length || 0,
      lastConnected: client.server.lastConnected,
    }));

    return res.json({ connected });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching connected MCP servers:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_CONNECTED_SERVERS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// === MCP Provider Manager Endpoints ===

// GET /api/mcp/providers - Get all MCP providers
router.get('/providers', async (req, res) => {
  try {
    const providers = mcpProviderManager.getAllProviders();
    const statuses = mcpProviderManager.getAllProviderStatuses();

    const providersWithStatus = providers.map((provider: any) => ({
      ...provider,
      status: statuses[provider.id] || {
        id: provider.id,
        status: 'stopped',
        lastCheck: new Date(),
      },
    }));

    return res.json({
      success: true,
      data: providersWithStatus,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP providers:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDERS_GET_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/mcp/providers/:id - Get MCP provider by ID
router.get('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const provider = mcpProviderManager.getProvider(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    const status = mcpProviderManager.getProviderStatus(id);

    return res.json({
      success: true,
      data: {
        ...provider,
        status,
      },
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_GET_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/providers - Create new MCP provider
router.post('/providers', async (req, res) => {
  try {
    const providerConfig: MCPProviderConfig = req.body;

    // Validate configuration
    const validation = mcpProviderManager.validateProviderConfig(providerConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MCP provider configuration',
        details: validation.errors,
      });
    }

    await mcpProviderManager.addProvider(providerConfig);

    return res.status(201).json({
      success: true,
      data: providerConfig,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to create MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_CREATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/mcp/providers/:id - Update MCP provider
router.put('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates: Partial<MCPProviderConfig> = req.body;

    // Validate updates
    const existingProvider = mcpProviderManager.getProvider(id);
    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    const updatedConfig = { ...existingProvider, ...updates };
    const validation = mcpProviderManager.validateProviderConfig(updatedConfig);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MCP provider configuration',
        details: validation.errors,
      });
    }

    await mcpProviderManager.updateProvider(id, updates);

    return res.json({
      success: true,
      data: updatedConfig,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to update MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_UPDATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/mcp/providers/:id - Delete MCP provider
router.delete('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    await mcpProviderManager.removeProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider deleted successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to delete MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_DELETE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/providers/:id/start - Start MCP provider
router.post('/providers/:id/start', async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    await mcpProviderManager.startProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider started successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to start MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_START_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/providers/:id/stop - Stop MCP provider
router.post('/providers/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    await mcpProviderManager.stopProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider stopped successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to stop MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_STOP_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/mcp/providers/:id/test - Test MCP provider
router.post('/providers/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    const testResult = await mcpProviderManager.testProvider(id);

    return res.json({
      success: true,
      data: testResult,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to test MCP provider:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_TEST_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/mcp/providers/templates - Get MCP provider templates
router.get('/providers/templates', async (req, res) => {
  try {
    const templates = mcpProviderManager.getTemplates();

    return res.json({
      success: true,
      data: templates,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider templates:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_TEMPLATES_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/mcp/providers/stats - Get MCP provider statistics
router.get('/providers/stats', async (req, res) => {
  try {
    const stats = mcpProviderManager.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider statistics:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_PROVIDER_STATS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
