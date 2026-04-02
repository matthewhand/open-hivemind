import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { McpToolTestSchema } from '../../validation/schemas/mcpSchema';
import { validateRequest } from '../../validation/validateRequest';
import { connectedClients, loadMCPServers } from './mcp';
import { asyncErrorHandler } from '../../middleware/errorHandler';

const debug = Debug('app:webui:mcpToolsTesting');
const router = Router();

/**
 * GET /api/admin/mcp-tools/list
 * List all available MCP tools from all connected servers
 */
router.get('/list', asyncErrorHandler(async (req, res) => {
  try {
    // Load MCP servers configuration directly instead of HTTP fetch
    const servers = await loadMCPServers();

    const tools: any[] = [];

    // Update connection status and collect tools from active clients
    const updatedServers = servers.map((server) => ({
      ...server,
      connected: connectedClients.has(server.name),
      tools: connectedClients.get(server.name)?.server.tools || server.tools,
    }));

    updatedServers.forEach((server: any) => {
      if (server.connected && server.tools && Array.isArray(server.tools)) {
        server.tools.forEach((tool: any) => {
          tools.push({
            id: `${server.name}-${tool.name}`,
            name: tool.name,
            description: tool.description || 'No description available',
            serverId: server.name,
            serverName: server.name,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema || {},
          });
        });
      }
    });

    return res.json({
      success: true,
      data: {
        tools,
        totalServers: servers.length || 0,
        connectedServers: updatedServers.filter((s: any) => s.connected).length || 0,
      },
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error listing MCP tools:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_TOOLS_LIST_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/admin/mcp-tools/test
 * Test a tool with provided parameters
 *
 * Body:
 * {
 *   serverName: string,
 *   toolName: string,
 *   arguments: Record<string, any>
 * }
 */
router.post('/test', validateRequest(McpToolTestSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { serverName, toolName, arguments: toolArgs } = req.body;

    if (!serverName || !toolName) {
      return res.status(400).json({
        success: false,
        error: 'Server name and tool name are required',
        code: 'INVALID_REQUEST',
      });
    }

    const startTime = Date.now();

    // Get the MCP client directly from the in-memory store instead of HTTP fetch
    const mcpClient = connectedClients.get(serverName);
    if (!mcpClient) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not connected',
        code: 'MCP_SERVER_NOT_CONNECTED',
        timestamp: new Date().toISOString(),
      });
    }

    // Call the tool directly using the MCP client
    const result = await mcpClient.client.callTool({
      name: toolName,
      arguments: toolArgs || {},
    });

    const executionTime = Date.now() - startTime;

    return res.json({
      success: true,
      data: {
        result,
        executionTime,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Error testing MCP tool:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'MCP_TOOL_TEST_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;
