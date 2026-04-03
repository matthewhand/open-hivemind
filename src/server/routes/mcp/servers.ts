import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { HTTP_STATUS } from '../../../types/constants';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import {
  AddMCPServerSchema,
  CallMCPToolSchema,
  MCPServerNameParamSchema,
} from '../../../validation/schemas/mcpSchema';
import { validateRequest } from '../../../validation/validateRequest';
import {
  connectedClients,
  connectToMCPServer,
  disconnectFromMCPServer,
  loadMCPServers,
  saveMCPServers,
  type MCPServer,
} from './shared';

const debug = Debug('app:webui:mcp:servers');
const router = Router();
router.get('/servers', asyncErrorHandler(async (req, res) => {
  try {
    const servers = await loadMCPServers();

    // Update connection status based on active clients
    const updatedServers = servers.map((server) => ({
      ...server,
      connected: connectedClients.has(server.name),
      tools: connectedClients.get(server.name)?.server.tools || server.tools,
    }));

    return res.json({ success: true, data: { servers: updatedServers } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching MCP servers:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVERS_FETCH_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/servers - Add new MCP server
router.post('/servers', validateRequest(AddMCPServerSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { name, url, apiKey } = req.body;

    const servers = await loadMCPServers();

    // Check if server already exists
    const existingServer = servers.find((s) => s.name === name);
    if (existingServer) {
      return res.status(HTTP_STATUS.OK).json({ success: true, data: { server: existingServer } });
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
    return res.json({ success: true, data: { server: newServer } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error adding MCP server:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVER_ADD_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/servers/:name/connect - Connect to MCP server
router.post(
  '/servers/:name/connect',
  validateRequest(MCPServerNameParamSchema),
  async (req, res) => {
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
          success: true,
          data: {
            server: mcpClient.server,
            message: 'Successfully connected to MCP server',
          },
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
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);

      debug('Error connecting to MCP server:', {
        message: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError),
        type: errorInfo.type,
        severity: errorInfo.severity,
      });

      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVER_CONNECT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /api/mcp/servers/:name/disconnect - Disconnect from MCP server
router.post(
  '/servers/:name/disconnect',
  validateRequest(MCPServerNameParamSchema),
  async (req, res) => {
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

      return res.json({
        success: true,
        data: { message: 'Successfully disconnected from MCP server' },
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);

      debug('Error disconnecting from MCP server:', {
        message: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError),
        type: errorInfo.type,
        severity: errorInfo.severity,
      });

      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVER_DISCONNECT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// DELETE /api/mcp/servers/:name - Remove MCP server
router.delete('/servers/:name', validateRequest(MCPServerNameParamSchema), asyncErrorHandler(async (req, res) => {
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
    return res.json({ success: true, data: { success: true } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error removing MCP server:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVER_REMOVE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// GET /api/mcp/servers/:name/tools - Get tools from MCP server
router.get('/servers/:name/tools', validateRequest(MCPServerNameParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { name } = req.params;

    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'MCP server not connected' });
    }

    const toolsResponse = await mcpClient.client.listTools();
    const tools = toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema,
    }));

    return res.json({ success: true, data: { tools } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching MCP server tools:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_SERVER_TOOLS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/servers/:name/call-tool - Call a tool on MCP server
router.post('/servers/:name/call-tool', validateRequest(CallMCPToolSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { name } = req.params;
    const { toolName, arguments: toolArgs } = req.body;

    const mcpClient = connectedClients.get(name);
    if (!mcpClient) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'MCP server not connected' });
    }

    const result = await mcpClient.client.callTool({
      name: toolName,
      arguments: toolArgs || {},
    });

    return res.json({ success: true, data: { result } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error calling MCP tool:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_TOOL_CALL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// GET /api/mcp/connected - Get all connected MCP servers
router.get('/connected', asyncErrorHandler(async (req, res) => {
  try {
    const connected = Array.from(connectedClients.values()).map((client) => ({
      name: client.server.name,
      url: client.server.url,
      toolCount: client.server.tools?.length || 0,
      lastConnected: client.server.lastConnected,
    }));

    return res.json({ success: true, data: { connected } });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error fetching connected MCP servers:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_CONNECTED_SERVERS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// === MCP Provider Manager Endpoints ===

// GET /api/mcp/providers - Get all MCP providers

export default router;
