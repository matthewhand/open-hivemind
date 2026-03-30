import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';

const debug = Debug('app:webui:mcpToolsTesting');
const router = Router();

// In-memory store for connected MCP clients (imported from mcp.ts route)
// We'll reuse the existing MCP infrastructure

/**
 * GET /api/admin/mcp-tools/list
 * List all available MCP tools from all connected servers
 */
router.get('/list', async (req, res) => {
  try {
    // Reuse the existing /api/mcp/servers endpoint logic
    const servers = await fetch('http://localhost:3000/api/mcp/servers').then((r) => r.json());

    const tools: any[] = [];

    if (servers.servers && Array.isArray(servers.servers)) {
      servers.servers.forEach((server: any) => {
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
    }

    return res.json({
      success: true,
      data: {
        tools,
        totalServers: servers.servers?.length || 0,
        connectedServers: servers.servers?.filter((s: any) => s.connected).length || 0,
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
});

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
router.post('/test', async (req, res) => {
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

    // Call the existing MCP tool execution endpoint
    const response = await fetch(`http://localhost:3000/api/mcp/servers/${serverName}/call-tool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName,
        arguments: toolArgs || {},
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        success: false,
        error: errorData.error || 'Tool execution failed',
        code: errorData.code || 'TOOL_EXECUTION_ERROR',
        executionTime,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await response.json();

    return res.json({
      success: true,
      data: {
        result: result.result,
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
});

export default router;
