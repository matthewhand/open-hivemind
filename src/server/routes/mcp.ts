import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { Router } from 'express';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ErrorUtils } from '@src/types/errors';
import MCPProviderManager from '../../config/MCPProviderManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import type { MCPProviderConfig } from '../../types/mcp';
import {
  AddMCPServerSchema,
  CallMCPToolSchema,
  CreateMCPProviderSchema,
  MCPProviderIdParamSchema,
  MCPServerNameParamSchema,
  UpdateMCPProviderSchema,
} from '../../validation/schemas/mcpSchema';
import { validateRequest } from '../../validation/validateRequest';

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
    inputSchema: Record<string, unknown>;
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
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error creating data directory:', ErrorUtils.getMessage(hivemindError));
  }
};

// Load/Save MCP server configurations
const loadMCPServers = async (): Promise<MCPServer[]> => {
  try {
    const data = await fs.readFile(MCP_SERVERS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(
      'MCP servers config file not found, using defaults:',
      ErrorUtils.getMessage(hivemindError)
    );
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
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const transport = new StdioClientTransport({
        command: command,
        args: [],
      });

      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
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
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(`Failed to connect to MCP server ${server.name}:`, ErrorUtils.getMessage(hivemindError));
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
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug(
      `Error disconnecting from MCP server ${serverName}:`,
      ErrorUtils.getMessage(hivemindError)
    );
    throw hivemindError;
  }
};

// Routes

// GET /api/mcp/servers - Get all MCP servers
router.get(
  '/servers',
  asyncErrorHandler(async (req, res) => {
    const servers = await loadMCPServers();

    // Update connection status based on active clients
    const updatedServers = servers.map((server) => ({
      ...server,
      connected: connectedClients.has(server.name),
      tools: connectedClients.get(server.name)?.server.tools || server.tools,
    }));

    return res.json({ servers: updatedServers });
  })
);

// POST /api/mcp/servers - Add new MCP server
router.post(
  '/servers',
  validateRequest(AddMCPServerSchema),
  asyncErrorHandler(async (req, res) => {
    const { name, url, apiKey } = req.body;

    const servers = await loadMCPServers();

    // Check if server already exists
    const existingServer = servers.find((s) => s.name === name);
    if (existingServer) {
      return res.status(200).json({ server: existingServer });
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
  })
);

// POST /api/mcp/servers/:name/connect - Connect to MCP server
router.post(
  '/servers/:name/connect',
  validateRequest(MCPServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// POST /api/mcp/servers/:name/disconnect - Disconnect from MCP server
router.post(
  '/servers/:name/disconnect',
  validateRequest(MCPServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// DELETE /api/mcp/servers/:name - Remove MCP server
router.delete(
  '/servers/:name',
  validateRequest(MCPServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// GET /api/mcp/servers/:name/tools - Get tools from MCP server
router.get(
  '/servers/:name/tools',
  validateRequest(MCPServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// POST /api/mcp/servers/:name/call-tool - Call a tool on MCP server
router.post(
  '/servers/:name/call-tool',
  validateRequest(CallMCPToolSchema),
  asyncErrorHandler(async (req, res) => {
    const { name } = req.params;
    const { toolName, arguments: toolArgs } = req.body;

    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(404).json({ error: 'MCP server not connected' });
    }

    const result = await mcpClient.client.callTool({
      name: toolName,
      arguments: toolArgs || {},
    });

    return res.json({ result });
  })
);

// GET /api/mcp/connected - Get all connected MCP servers
router.get(
  '/connected',
  asyncErrorHandler(async (req, res) => {
    const connected = Array.from(connectedClients.values()).map((client) => ({
      name: client.server.name,
      url: client.server.url,
      toolCount: client.server.tools?.length || 0,
      lastConnected: client.server.lastConnected,
    }));

    return res.json({ connected });
  })
);

// === MCP Provider Manager Endpoints ===

// GET /api/mcp/providers - Get all MCP providers
router.get(
  '/providers',
  asyncErrorHandler(async (req, res) => {
    const providers = mcpProviderManager.getAllProviders();
    const statuses = mcpProviderManager.getAllProviderStatuses();

    const providersWithStatus = providers.map((provider) => ({
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
  })
);

// GET /api/mcp/providers/:id - Get MCP provider by ID
router.get(
  '/providers/:id',
  validateRequest(MCPProviderIdParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// POST /api/mcp/providers - Create new MCP provider
router.post(
  '/providers',
  validateRequest(CreateMCPProviderSchema),
  asyncErrorHandler(async (req, res) => {
    const providerConfig: MCPProviderConfig = req.body;

    // Idempotency check: return existing if it exists by ID
    const existingProvider = mcpProviderManager.getProvider(providerConfig.id);
    if (existingProvider) {
      return res.status(200).json({
        success: true,
        data: existingProvider,
        message: 'Provider already exists',
      });
    }

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
  })
);

// PUT /api/mcp/providers/:id - Update MCP provider
router.put(
  '/providers/:id',
  validateRequest(UpdateMCPProviderSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// DELETE /api/mcp/providers/:id - Delete MCP provider
router.delete(
  '/providers/:id',
  validateRequest(MCPProviderIdParamSchema),
  asyncErrorHandler(async (req, res) => {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(200).json({
        success: true,
        message: 'MCP provider already deleted or not found',
      });
    }

    await mcpProviderManager.removeProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider deleted successfully',
    });
  })
);

// POST /api/mcp/providers/:id/start - Start MCP provider
router.post(
  '/providers/:id/start',
  validateRequest(MCPProviderIdParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// POST /api/mcp/providers/:id/stop - Stop MCP provider
router.post(
  '/providers/:id/stop',
  validateRequest(MCPProviderIdParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// POST /api/mcp/providers/:id/test - Test MCP provider
router.post(
  '/providers/:id/test',
  validateRequest(MCPProviderIdParamSchema),
  asyncErrorHandler(async (req, res) => {
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
  })
);

// GET /api/mcp/providers/templates - Get MCP provider templates
router.get(
  '/providers/templates',
  asyncErrorHandler(async (req, res) => {
    const templates = mcpProviderManager.getTemplates();

    return res.json({
      success: true,
      data: templates,
    });
  })
);

// GET /api/mcp/providers/stats - Get MCP provider statistics
router.get(
  '/providers/stats',
  asyncErrorHandler(async (req, res) => {
    const stats = mcpProviderManager.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  })
);

export default router;
