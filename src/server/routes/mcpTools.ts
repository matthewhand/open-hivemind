/**
 * MCP Tools Routes
 *
 * API endpoints for MCP tool listing and testing. Backed by the live
 * MCPService tool registry (tools discovered from connected MCP servers).
 */

import { Router } from 'express';
import { MCPService } from '@src/mcp/MCPService';

const router = Router();

/**
 * GET /api/mcp-tools/list
 * List available MCP tools from all connected servers.
 */
router.get('/list', (_req, res) => {
  try {
    const mcpService = MCPService.getInstance();
    const tools = mcpService.getAllTools();
    const servers = mcpService.getConnectedServers();
    res.json({
      tools,
      count: tools.length,
      servers,
    });
  } catch (error) {
    res.status(500).json({
      tools: [],
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/mcp-tools/test
 * Report MCP connectivity status (connected servers + tool counts).
 */
router.get('/test', (_req, res) => {
  try {
    const mcpService = MCPService.getInstance();
    const servers = mcpService.getConnectedServers();
    const tools = mcpService.getAllTools();
    res.json({
      status: servers.length > 0 ? 'ok' : 'no_servers',
      message:
        servers.length > 0
          ? `MCP tools reachable via ${servers.length} connected server(s)`
          : 'No MCP servers currently connected',
      connectedServers: servers.length,
      servers,
      toolCount: tools.length,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      connectedServers: 0,
      servers: [],
      toolCount: 0,
    });
  }
});

export default router;
