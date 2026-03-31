import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { Router } from 'express';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ErrorUtils } from '@src/types/errors';
import { HTTP_STATUS } from '../../../types/constants';
import {
  AddMCPServerSchema,
  MCPServerNameParamSchema,
} from '../../../validation/schemas/mcpSchema';
import { validateRequest } from '../../../validation/validateRequest';

const debug = Debug('app:webui:mcp:servers');
const router = Router();

export interface MCPServer {
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

export interface MCPClient {
  client: Client;
  transport: StdioClientTransport;
  server: MCPServer;
}

const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

// In-memory store for connected MCP clients
export const connectedClients = new Map<string, MCPClient>();

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
export const loadMCPServers = async (): Promise<MCPServer[]> => {
  try {
    const data = await fs.readFile(MCP_SERVERS_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug('MCP servers config file not found, using defaults:', hivemindError.message);
    return [];
  }
};

export const saveMCPServers = async (servers: MCPServer[]): Promise<void> => {
  await ensureDataDir();
  await fs.writeFile(MCP_SERVERS_CONFIG_FILE, JSON.stringify(servers, null, 2));
};

// Connect to MCP server
export const connectToMCPServer = async (server: MCPServer): Promise<MCPClient> => {
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
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    debug(`Failed to connect to MCP server ${server.name}:`, hivemindError.message);
    throw hivemindError;
  }
};

// Disconnect from MCP server
export const disconnectFromMCPServer = async (serverName: string): Promise<void> => {
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
router.get('/', async (req, res) => {
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
router.post('/', validateRequest(AddMCPServerSchema), async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;

    const servers = await loadMCPServers();

    // Check if server already exists
    const existingServer = servers.find((s) => s.name === name);
    if (existingServer) {
      return res.status(HTTP_STATUS.OK).json({ server: existingServer });
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
router.post('/:name/connect', validateRequest(MCPServerNameParamSchema), async (req, res) => {
  try {
    const { name } = req.params;

    const servers = await loadMCPServers();
    const server = servers.find((s) => s.name === name);

    if (!server) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'MCP server not found' });
    }

    if (connectedClients.has(name)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'MCP server already connected' });
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

      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ error: `Failed to connect to MCP server: ${error}` });
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
router.post('/:name/disconnect', validateRequest(MCPServerNameParamSchema), async (req, res) => {
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
router.delete('/:name', validateRequest(MCPServerNameParamSchema), async (req, res) => {
  try {
    const { name } = req.params;

    // Disconnect if connected
    if (connectedClients.has(name)) {
      await disconnectFromMCPServer(name);
    }

    const servers = await loadMCPServers();
    const filteredServers = servers.filter((s) => s.name !== name);

    if (filteredServers.length === servers.length) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'MCP server not found' });
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

// GET /api/mcp/connected - Get all connected MCP servers (moving to root in index)
// But we'll keep the handler here to use local state, or export the logic
export const getConnectedServers = async (req: any, res: any) => {
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
};

export default router;
