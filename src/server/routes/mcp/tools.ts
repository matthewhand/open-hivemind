import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { HTTP_STATUS } from '../../../types/constants';
import { CallMCPToolSchema, MCPServerNameParamSchema } from '../../../validation/schemas/mcpSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { connectedClients } from './servers';

const debug = Debug('app:webui:mcp:tools');
const router = Router();

// GET /api/mcp/servers/:name/tools - Get tools from MCP server
router.get('/:name/tools', validateRequest(MCPServerNameParamSchema), async (req, res) => {
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
router.post('/:name/call-tool', validateRequest(CallMCPToolSchema), async (req, res) => {
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

export default router;
