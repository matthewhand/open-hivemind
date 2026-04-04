import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { getTrustedMcpReposConfig } from '../../../config/trustedMcpRepos';
import { MCPService } from '../../../mcp/MCPService';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import { webUIStorage } from '../../../storage/webUIStorage';
import { HTTP_STATUS } from '../../../types/constants';
import { isSafeUrl } from '../../../utils/ssrfGuard';
import {
  McpServerBulkDisconnectSchema,
  McpServerConnectSchema,
  McpServerDisconnectSchema,
  McpServerTestSchema,
  ServerNameParamSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';

const router = Router();

const isTestEnv = process.env.NODE_ENV === 'test';
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

// Test connection to an MCP server
router.post(
  '/mcp-servers/test',
  configRateLimit,
  validateRequest(McpServerTestSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { serverUrl, apiKey, name } = req.body;

      // Validation
      if (!serverUrl) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server URL is required',
        });
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server URL must be a valid URL',
        });
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: 'Security Warning',
          message: 'Target URL is blocked for security reasons (private/local network access).',
        });
      }

      const mcpService = MCPService.getInstance();
      // Use a temporary name if not provided
      const configName = name || `test-${Date.now()}`;

      const tools = await mcpService.testConnection({ serverUrl, apiKey, name: configName });

      return res.json({
        success: true,
        data: {
          toolCount: tools.length,
          tools,
        },
        message: `Successfully tested connection to MCP server. Found ${tools.length} tools.`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to connect to MCP server',
        message: hivemindError.message || 'An error occurred while connecting to MCP server',
      });
    }
  })
);

// Connect to an MCP server
router.post(
  '/mcp-servers/connect',
  configRateLimit,
  validateRequest(McpServerConnectSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { serverUrl, apiKey, name } = req.body;

      // Validation
      if (!serverUrl || !name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server URL and name are required',
        });
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server URL must be a valid URL',
        });
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: 'Security Warning',
          message: 'Target URL is blocked for security reasons (private/local network access).',
        });
      }

      // Sanitize API key for storage
      const sanitizedApiKey = apiKey ? apiKey.substring(0, 3) + '***' : '';

      const mcpService = MCPService.getInstance();
      const tools = await mcpService.connectToServer({ serverUrl, apiKey, name });

      // Save to persistent storage with sanitized API key
      await webUIStorage.saveMcp({ name, serverUrl, apiKey: sanitizedApiKey });

      return res.json({
        success: true,
        data: { tools },
        message: `Successfully connected to MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to connect to MCP server',
        message: hivemindError.message || 'An error occurred while connecting to MCP server',
      });
    }
  })
);

// Disconnect from an MCP server
router.post(
  '/mcp-servers/disconnect',
  validateRequest(McpServerDisconnectSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name } = req.body;

      // Validation
      if (!name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server name is required',
        });
      }

      const mcpService = MCPService.getInstance();
      await mcpService.disconnectFromServer(name);

      return res.json({
        success: true,
        message: `Successfully disconnected from MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to disconnect from MCP server',
        message: hivemindError.message || 'An error occurred while disconnecting from MCP server',
      });
    }
  })
);

// Delete an MCP server
router.delete(
  '/mcp-servers/:name',
  validateRequest(ServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      await mcpService.disconnectFromServer(name);

      // Remove from persistent storage
      await webUIStorage.deleteMcp(name);

      return res.json({
        success: true,
        message: `Successfully deleted MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to delete MCP server',
        message: hivemindError.message || 'An error occurred while deleting MCP server',
      });
    }
  })
);

// Get all connected MCP servers
router.get('/mcp-servers', async (req: Request, res: Response) => {
  try {
    const mcpService = MCPService.getInstance();
    const connectedServers = mcpService.getConnectedServersWithMetadata();
    const trustConfig = getTrustedMcpReposConfig();

    // Get stored MCP server configurations
    const storedMcps = await webUIStorage.getMcps();

    // Enrich connected servers with stored configuration data
    const enrichedServers = connectedServers.map((server) => {
      const storedConfig = storedMcps.find((mcp: any) => mcp.name === server.name);
      return {
        name: server.name,
        serverUrl: storedConfig?.serverUrl || storedConfig?.url || '',
        connected: server.connected,
        tools: server.tools,
        toolCount: server.toolCount,
        lastConnected: server.lastConnected,
        description: storedConfig?.description || '',
      };
    });

    return res.json({
      success: true,
      data: {
        servers: enrichedServers,
        configurations: storedMcps,
        trustedRepositories: trustConfig.trustedRepositories,
        cautionRepositories: trustConfig.cautionRepositories,
        trustSettings: trustConfig.settings,
      },
      message: 'Connected MCP servers retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to retrieve MCP servers',
      message: hivemindError.message || 'An error occurred while retrieving MCP servers',
    });
  }
});

// Get tools from a specific MCP server
router.get(
  '/mcp-servers/:name/tools',
  validateRequest(ServerNameParamSchema),
  (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      const tools = mcpService.getToolsFromServer(name);

      if (!tools) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Server not found',
          message: `MCP server ${name} not found or not connected`,
        });
      }

      return res.json({
        success: true,
        data: { tools },
        message: `Tools retrieved successfully from MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve tools',
        message: hivemindError.message || 'An error occurred while retrieving tools',
      });
    }
  }
);

// Get individual server status with tools
router.get(
  '/mcp-servers/:name/status',
  validateRequest(ServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      const tools = mcpService.getToolsFromServer(name);
      const connectedServers = mcpService.getConnectedServers();
      const isConnected = connectedServers.includes(name);

      // Get stored configuration for additional metadata
      const storedMcps = await webUIStorage.getMcps();
      const storedConfig = storedMcps.find((mcp: any) => mcp.name === name);

      if (!isConnected && !storedConfig) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Server not found',
          message: `MCP server ${name} not found`,
        });
      }

      const status = {
        name,
        connected: isConnected,
        serverUrl: storedConfig?.serverUrl || '',
        toolCount: tools?.length || 0,
        tools: tools || [],
        lastConnected: isConnected ? new Date().toISOString() : undefined,
      };

      return res.json({
        success: true,
        data: { server: status },
        message: `Status retrieved successfully for MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to retrieve server status',
        message: hivemindError.message || 'An error occurred while retrieving server status',
      });
    }
  })
);

// Restart an MCP server (disconnect and reconnect)
router.post(
  '/mcp-servers/:name/restart',
  configRateLimit,
  validateRequest(ServerNameParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name } = req.params;

      // Get stored configuration
      const storedMcps = await webUIStorage.getMcps();
      const storedConfig = storedMcps.find((mcp: any) => mcp.name === name);

      if (!storedConfig) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Server not found',
          message: `MCP server ${name} not found in configuration`,
        });
      }

      // Validate URL format
      try {
        new URL(String(storedConfig.serverUrl));
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Server URL must be a valid URL',
        });
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(String(storedConfig.serverUrl)))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: 'Security Warning',
          message: 'Target URL is blocked for security reasons (private/local network access).',
        });
      }

      const mcpService = MCPService.getInstance();

      // Disconnect if currently connected
      const connectedServers = mcpService.getConnectedServers();
      if (connectedServers.includes(name)) {
        await mcpService.disconnectFromServer(name);
      }

      // Reconnect
      const tools = await mcpService.connectToServer({
        name: String(storedConfig.name),
        serverUrl: String(storedConfig.serverUrl),
        apiKey: String(storedConfig.apiKey || ''),
      });

      return res.json({
        success: true,
        data: {
          toolCount: tools.length,
          tools,
        },
        message: `Successfully restarted MCP server: ${name}`,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to restart MCP server',
        message: hivemindError.message || 'An error occurred while restarting MCP server',
      });
    }
  })
);

// Bulk disconnect multiple servers
router.post(
  '/mcp-servers/bulk-disconnect',
  validateRequest(McpServerBulkDisconnectSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { names } = req.body;

      if (!Array.isArray(names) || names.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'At least one server name is required',
        });
      }

      const mcpService = MCPService.getInstance();
      const results = {
        successful: [] as string[],
        failed: [] as { name: string; error: string }[],
      };

      // Disconnect each server
      for (const name of names) {
        try {
          await mcpService.disconnectFromServer(name);
          results.successful.push(name);
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          results.failed.push({
            name,
            error: hivemindError.message || 'Unknown error',
          });
        }
      }

      const message =
        results.failed.length === 0
          ? `Successfully disconnected ${results.successful.length} server(s)`
          : `Disconnected ${results.successful.length} server(s), ${results.failed.length} failed`;

      return res.json({
        success: results.failed.length === 0,
        data: results,
        message,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to disconnect servers',
        message: hivemindError.message || 'An error occurred while disconnecting servers',
      });
    }
  })
);

export default router;
