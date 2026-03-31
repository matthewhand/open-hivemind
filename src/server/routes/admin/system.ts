import { Router, type Request, type Response } from 'express';
import { container } from 'tsyringe';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { getTrustedMcpReposConfig } from '../../../config/trustedMcpRepos';
import { DatabaseManager } from '../../../database/DatabaseManager';
import { MCPService } from '../../../mcp/MCPService';
import ApiMonitorService from '../../../services/ApiMonitorService';
import { webUIStorage } from '../../../storage/webUIStorage';
import { HTTP_STATUS } from '../../../types/constants';
import { getRelevantEnvVars } from '../../../utils/envUtils';
import { isSafeUrl } from '../../../utils/ssrfGuard';
import {
  LlmProviderSchema,
  McpServerBulkDisconnectSchema,
  McpServerConnectSchema,
  McpServerDisconnectSchema,
  McpServerTestSchema,
  MessengerProviderSchema,
  ServerNameParamSchema,
  TestConnectionSchema,
  ToggleIdParamSchema,
  ToggleProviderSchema,
  UpdateLlmProviderSchema,
  UpdateMessengerProviderSchema,
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

// GET /llm-providers - Get all LLM providers
router.get('/llm-providers', (req: Request, res: Response) => {
  try {
    const providers = webUIStorage.getLlmProviders();
    return res.json(ApiResponse.success({ providers }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve LLM providers'));
  }
});

/**
 * @openapi
 * /api/admin/llm-providers:
 *   post:
 *     summary: Create a new LLM provider
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string }
 *               config: { type: object }
 *             required: [name, type, config]
 *     responses:
 *       200:
 *         description: Created LLM provider
 */
router.post(
  '/llm-providers',
  configRateLimit,
  validateRequest(LlmProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, type, config } = req.body;

      // Sanitize sensitive data
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.apiKey) {
        sanitizedConfig.apiKey = sanitizedConfig.apiKey.substring(0, 3) + '***';
      }
      if (sanitizedConfig.botToken) {
        sanitizedConfig.botToken = sanitizedConfig.botToken.substring(0, 3) + '***';
      }

      const newProvider = {
        id: `llm${Date.now()}`,
        name,
        type,
        config: sanitizedConfig,
        isActive: true,
      };

      // Save to persistent storage
      await webUIStorage.saveLlmProvider(newProvider);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json(ApiResponse.success({ provider: newProvider }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to create LLM provider'));
    }
  }
);

// PUT /llm-providers/:id - Update an existing LLM provider
router.put(
  '/llm-providers/:id',
  validateRequest(UpdateLlmProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;

      // Get existing provider to preserve ID and status if needed, or just overwrite
      const providers = webUIStorage.getLlmProviders();
      const existingProvider = providers.find((p: any) => p.id === id);

      const updatedProvider = {
        id,
        name,
        type,
        config,
        isActive: existingProvider ? existingProvider.isActive : true,
      };

      // Save to persistent storage
      await webUIStorage.saveLlmProvider(updatedProvider);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json(ApiResponse.success({ provider: updatedProvider }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update LLM provider'));
    }
  }
);

/**
 * @openapi
 * /api/admin/llm-providers/{id}:
 *   delete:
 *     summary: Delete an LLM provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted LLM provider
 */
router.delete(
  '/llm-providers/:id',
  validateRequest(ToggleIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      await webUIStorage.deleteLlmProvider(id);

      // Sync monitor endpoints
      container.resolve(ApiMonitorService).syncLlmEndpoints();

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete LLM provider'));
    }
  }
);

// POST /llm-providers/:id/toggle - Toggle LLM provider active status
router.post(
  '/llm-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = webUIStorage.getLlmProviders();
      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        await webUIStorage.saveLlmProvider(provider);

        // Sync monitor endpoints
        container.resolve(ApiMonitorService).syncLlmEndpoints();
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
      }

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update provider status'));
    }
  }
);

// POST /providers/test-connection - Test connection to an LLM provider
router.post(
  '/providers/test-connection',
  configRateLimit,
  validateRequest(TestConnectionSchema),
  async (req: Request, res: Response) => {
    try {
      const { providerType, config } = req.body;

      debug(`Testing connection for provider type: ${providerType}`);

      // Validate provider type
      const validProviderTypes = ['openai', 'flowise', 'openwebui', 'letta'];
      if (!validProviderTypes.includes(providerType.toLowerCase())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Invalid provider type'));
      }

      // Dynamically load and test the provider
      const { instantiateLlmProvider, loadPlugin } = await import('../../plugins/PluginLoader');

      let provider;
      try {
        const mod = await loadPlugin(`llm-${providerType.toLowerCase()}`);
        provider = instantiateLlmProvider(mod, config);
        debug(`Loaded provider plugin: llm-${providerType}`);
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        debug(`Failed to load provider plugin: ${hivemindError.message}`);
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Failed to load provider'));
      }

      // Test the connection based on provider type
      let testResult: {
        success: boolean;
        message: string;
        details?: any;
      };

      try {
        switch (providerType.toLowerCase()) {
          case 'openai': {
            // For OpenAI, we test by making a simple completion request
            if (!config.apiKey && !process.env.OPENAI_API_KEY) {
              testResult = {
                success: false,
                message: 'API key is required for OpenAI provider',
              };
              break;
            }

            try {
              // Test with a simple message
              const testResponse = await provider.generateChatCompletion('Hello', [], {
                maxTokensOverride: 5,
              });

              testResult = {
                success: true,
                message: 'Successfully connected to OpenAI',
                details: {
                  responseReceived: !!testResponse,
                  model: config.model || 'gpt-4o',
                },
              };
            } catch (error: unknown) {
              const hivemindError = ErrorUtils.toHivemindError(error);
              testResult = {
                success: false,
                message: `Connection test failed: ${hivemindError.message}`,
                details: {
                  error: hivemindError.message,
                  code: hivemindError.code,
                },
              };
            }
            break;
          }

          case 'flowise': {
            // For Flowise, we validate configuration
            if (!config.chatflowId && !config.useRest) {
              testResult = {
                success: false,
                message:
                  'Either chatflowId or useRest configuration is required for Flowise provider',
              };
              break;
            }

            if (config.baseUrl) {
              try {
                new URL(config.baseUrl);
                if (!(await isSafeUrl(config.baseUrl))) {
                  testResult = {
                    success: false,
                    message: 'Base URL is blocked for security reasons',
                  };
                  break;
                }
              } catch {
                testResult = {
                  success: false,
                  message: 'Invalid base URL format',
                };
                break;
              }
            }

            testResult = {
              success: true,
              message: 'Flowise configuration is valid',
              details: {
                useRest: config.useRest || false,
                chatflowId: config.chatflowId ? '***' : undefined,
              },
            };
            break;
          }

          case 'openwebui': {
            // For OpenWebUI, we validate URL
            if (!config.baseUrl) {
              testResult = {
                success: false,
                message: 'Base URL is required for OpenWebUI provider',
              };
              break;
            }

            try {
              new URL(config.baseUrl);
              if (!(await isSafeUrl(config.baseUrl))) {
                testResult = {
                  success: false,
                  message: 'Base URL is blocked for security reasons',
                };
                break;
              }
            } catch {
              testResult = {
                success: false,
                message: 'Invalid base URL format',
              };
              break;
            }

            testResult = {
              success: true,
              message: 'OpenWebUI configuration is valid',
              details: {
                baseUrl: config.baseUrl,
              },
            };
            break;
          }

          case 'letta': {
            // For Letta, we validate configuration
            if (!config.baseUrl && !config.agentId) {
              testResult = {
                success: false,
                message: 'Base URL and Agent ID are required for Letta provider',
              };
              break;
            }

            if (config.baseUrl) {
              try {
                new URL(config.baseUrl);
                if (!(await isSafeUrl(config.baseUrl))) {
                  testResult = {
                    success: false,
                    message: 'Base URL is blocked for security reasons',
                  };
                  break;
                }
              } catch {
                testResult = {
                  success: false,
                  message: 'Invalid base URL format',
                };
                break;
              }
            }

            testResult = {
              success: true,
              message: 'Letta configuration is valid',
              details: {
                agentId: config.agentId ? '***' : undefined,
              },
            };
            break;
          }

          default:
            testResult = {
              success: false,
              message: `Unsupported provider type: ${providerType}`,
            };
        }

        return res.json(
          ApiResponse.success({
            success: testResult.success,
            message: testResult.message,
            data: testResult.details,
          })
        );
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(error);
        debug(`Connection test error: ${hivemindError.message}`);
        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error('Connection test failed'));
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug(`Unexpected error in test-connection endpoint: ${hivemindError.message}`);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to test connection'));
    }
  }
);

// GET /messenger-providers - Get all messenger providers
router.get('/messenger-providers', (req: Request, res: Response) => {
  try {
    const providers = webUIStorage.getMessengerProviders();
    return res.json(ApiResponse.success({ providers }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve messenger providers'));
  }
});

/**
 * @openapi
 * /api/admin/messenger-providers:
 *   post:
 *     summary: Create a new messenger provider
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string }
 *               config: { type: object }
 *             required: [name, type, config]
 *     responses:
 *       200:
 *         description: Created messenger provider
 */
router.post(
  '/messenger-providers',
  validateRequest(MessengerProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, type, config } = req.body;

      // Sanitize sensitive data
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.token) {
        sanitizedConfig.token = sanitizedConfig.token.substring(0, 3) + '***';
      }
      if (sanitizedConfig.botToken) {
        sanitizedConfig.botToken = sanitizedConfig.botToken.substring(0, 3) + '***';
      }
      if (sanitizedConfig.signingSecret) {
        sanitizedConfig.signingSecret = sanitizedConfig.signingSecret.substring(0, 3) + '***';
      }

      const newProvider = {
        id: `messenger${Date.now()}`,
        name,
        type,
        config: sanitizedConfig,
        isActive: true,
      };

      // Save to persistent storage
      await webUIStorage.saveMessengerProvider(newProvider);

      return res.json(ApiResponse.success({ provider: newProvider }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to create messenger provider'));
    }
  }
);

// PUT /messenger-providers/:id - Update an existing messenger provider
router.put(
  '/messenger-providers/:id',
  validateRequest(UpdateMessengerProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;

      // Validation
      if (!name || !type || !config) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Get existing provider to preserve ID and status if needed
      const providers = webUIStorage.getMessengerProviders();
      const existingProvider = providers.find((p: any) => p.id === id);

      // Sanitize sensitive data
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.token) {
        sanitizedConfig.token = sanitizedConfig.token.substring(0, 3) + '***';
      }
      if (sanitizedConfig.botToken) {
        sanitizedConfig.botToken = sanitizedConfig.botToken.substring(0, 3) + '***';
      }
      if (sanitizedConfig.signingSecret) {
        sanitizedConfig.signingSecret = sanitizedConfig.signingSecret.substring(0, 3) + '***';
      }

      const updatedProvider = {
        id,
        name,
        type,
        config: sanitizedConfig,
        isActive: existingProvider ? existingProvider.isActive : true,
      };

      // Save to persistent storage
      await webUIStorage.saveMessengerProvider(updatedProvider);

      return res.json(ApiResponse.success({ provider: updatedProvider }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update messenger provider'));
    }
  }
);

/**
 * @openapi
 * /api/admin/messenger-providers/{id}:
 *   delete:
 *     summary: Delete a messenger provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted messenger provider
 */
router.delete(
  '/messenger-providers/:id',
  validateRequest(ToggleIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      await webUIStorage.deleteMessengerProvider(id);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete messenger provider'));
    }
  }
);

// POST /messenger-providers/:id/toggle - Toggle messenger provider active status
router.post(
  '/messenger-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = webUIStorage.getMessengerProviders();
      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        await webUIStorage.saveMessengerProvider(provider);
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
      }

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update provider status'));
    }
  }
);

// Test connection to an MCP server
router.post(
  '/mcp-servers/test',
  configRateLimit,
  validateRequest(McpServerTestSchema),
  async (req: Request, res: Response) => {
    try {
      const { serverUrl, apiKey, name } = req.body;

      // Validation
      if (!serverUrl) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(ApiResponse.error('Security Warning'));
      }

      const mcpService = MCPService.getInstance();
      // Use a temporary name if not provided
      const configName = name || `test-${Date.now()}`;

      const tools = await mcpService.testConnection({ serverUrl, apiKey, name: configName });

      return res.json(
        ApiResponse.success({
          toolCount: tools.length,
          tools,
        })
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to connect to MCP server'));
    }
  }
);

// Connect to an MCP server
router.post(
  '/mcp-servers/connect',
  configRateLimit,
  validateRequest(McpServerConnectSchema),
  async (req: Request, res: Response) => {
    try {
      const { serverUrl, apiKey, name } = req.body;

      // Validation
      if (!serverUrl || !name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(ApiResponse.error('Security Warning'));
      }

      // Sanitize API key for storage
      const sanitizedApiKey = apiKey ? apiKey.substring(0, 3) + '***' : '';

      const mcpService = MCPService.getInstance();
      const tools = await mcpService.connectToServer({ serverUrl, apiKey, name });

      // Save to persistent storage with sanitized API key
      await webUIStorage.saveMcp({ name, serverUrl, apiKey: sanitizedApiKey });

      return res.json(ApiResponse.success({ tools }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to connect to MCP server'));
    }
  }
);

// Disconnect from an MCP server
router.post(
  '/mcp-servers/disconnect',
  validateRequest(McpServerDisconnectSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      // Validation
      if (!name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      const mcpService = MCPService.getInstance();
      await mcpService.disconnectFromServer(name);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to disconnect from MCP server'));
    }
  }
);

// Delete an MCP server
router.delete(
  '/mcp-servers/:name',
  validateRequest(ServerNameParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      await mcpService.disconnectFromServer(name);

      // Remove from persistent storage
      await webUIStorage.deleteMcp(name);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete MCP server'));
    }
  }
);

// Get all connected MCP servers
router.get('/mcp-servers', (req: Request, res: Response) => {
  try {
    const mcpService = MCPService.getInstance();
    const connectedServers = mcpService.getConnectedServersWithMetadata();
    const trustConfig = getTrustedMcpReposConfig();

    // Get stored MCP server configurations
    const storedMcps = webUIStorage.getMcps();

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

    return res.json(
      ApiResponse.success({
        servers: enrichedServers,
        configurations: storedMcps,
        trustedRepositories: trustConfig.trustedRepositories,
        cautionRepositories: trustConfig.cautionRepositories,
        trustSettings: trustConfig.settings,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve MCP servers'));
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
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Server not found'));
      }

      return res.json(ApiResponse.success({ tools }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to retrieve tools'));
    }
  }
);

// Get individual server status with tools
router.get(
  '/mcp-servers/:name/status',
  validateRequest(ServerNameParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      const tools = mcpService.getToolsFromServer(name);
      const connectedServers = mcpService.getConnectedServers();
      const isConnected = connectedServers.includes(name);

      // Get stored configuration for additional metadata
      const storedMcps = webUIStorage.getMcps();
      const storedConfig = storedMcps.find((mcp: any) => mcp.name === name);

      if (!isConnected && !storedConfig) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Server not found'));
      }

      const status = {
        name,
        connected: isConnected,
        serverUrl: storedConfig?.serverUrl || '',
        toolCount: tools?.length || 0,
        tools: tools || [],
        lastConnected: isConnected ? new Date().toISOString() : undefined,
      };

      return res.json(ApiResponse.success({ server: status }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to retrieve server status'));
    }
  }
);

// Restart an MCP server (disconnect and reconnect)
router.post(
  '/mcp-servers/:name/restart',
  configRateLimit,
  validateRequest(ServerNameParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      // Get stored configuration
      const storedMcps = webUIStorage.getMcps();
      const storedConfig = storedMcps.find((mcp: any) => mcp.name === name);

      if (!storedConfig) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Server not found'));
      }

      // Validate URL format
      try {
        new URL(storedConfig.serverUrl);
      } catch {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(storedConfig.serverUrl))) {
        return res.status(HTTP_STATUS.FORBIDDEN).json(ApiResponse.error('Security Warning'));
      }

      const mcpService = MCPService.getInstance();

      // Disconnect if currently connected
      const connectedServers = mcpService.getConnectedServers();
      if (connectedServers.includes(name)) {
        await mcpService.disconnectFromServer(name);
      }

      // Reconnect
      const tools = await mcpService.connectToServer({
        name: storedConfig.name,
        serverUrl: storedConfig.serverUrl,
        apiKey: storedConfig.apiKey,
      });

      return res.json(
        ApiResponse.success({
          toolCount: tools.length,
          tools,
        })
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to restart MCP server'));
    }
  }
);

// Bulk disconnect multiple servers
router.post(
  '/mcp-servers/bulk-disconnect',
  validateRequest(McpServerBulkDisconnectSchema),
  async (req: Request, res: Response) => {
    try {
      const { names } = req.body;

      if (!Array.isArray(names) || names.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
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

      return res.json(
        ApiResponse.success({
          success: results.failed.length === 0,
          data: results,
          message,
        })
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to disconnect servers'));
    }
  }
);

// Get environment variable overrides
router.get('/env-overrides', (req: Request, res: Response) => {
  try {
    const envVars = getRelevantEnvVars();

    return res.json(ApiResponse.success({ envVars }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve environment variable overrides'));
  }
});

// GET /providers - Get available providers
router.get('/providers', (req: Request, res: Response) => {
  try {
    const messageProviders = [
      {
        id: 'discord',
        name: 'Discord',
        description: 'Discord bot integration',
        configRequired: ['token'],
        envVarPrefix: 'DISCORD_',
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Slack bot integration',
        configRequired: ['botToken', 'appToken'],
        envVarPrefix: 'SLACK_',
      },
      {
        id: 'telegram',
        name: 'Telegram',
        description: 'Telegram bot integration',
        configRequired: ['token'],
        envVarPrefix: 'TELEGRAM_',
      },
      {
        id: 'mattermost',
        name: 'Mattermost',
        description: 'Mattermost bot integration',
        configRequired: ['token', 'serverUrl'],
        envVarPrefix: 'MATTERMOST_',
      },
    ];

    const llmProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI GPT models',
        configRequired: ['apiKey'],
        envVarPrefix: 'OPENAI_',
      },
      {
        id: 'flowise',
        name: 'Flowise',
        description: 'Flowise workflow engine',
        configRequired: ['baseUrl'],
        envVarPrefix: 'FLOWISE_',
      },
      {
        id: 'openwebui',
        name: 'Open WebUI',
        description: 'Open WebUI local models',
        configRequired: ['baseUrl'],
        envVarPrefix: 'OPENWEBUI_',
      },
    ];

    return res.json(
      ApiResponse.success({
        messageProviders,
        llmProviders,
      })
    );
  } catch (error) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to fetch providers'));
  }
});

// GET /system-info - Get system information
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
        stats: dbManager.isConnected() ? await dbManager.getStats() : null,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    return res.json(ApiResponse.success({ systemInfo }));
  } catch (error) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to fetch system info'));
  }
});

/**
 * @openapi
 * /api/admin/llm-providers/{type}/models:
 *   get:
 *     summary: List available models for an LLM provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider type (openai, anthropic, google, perplexity)
 *       - in: query
 *         name: modelType
 *         schema:
 *           type: string
 *           enum: [chat, embedding]
 *         description: Filter by model type
 *     responses:
 *       200:
 *         description: List of available models with metadata
 */
router.get('/llm-providers/:type/models', (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { modelType } = req.query;

    // Validate provider type
    const supportedProviders = getSupportedProviders();
    if (!supportedProviders.includes(type.toLowerCase())) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(
            `Unsupported provider type '${type}'. Supported providers: ${supportedProviders.join(', ')}`,
            'INVALID_PROVIDER_TYPE'
          )
        );
    }

    // Get models based on requested type
    let models;
    if (modelType === 'chat') {
      models = getChatModels(type);
    } else if (modelType === 'embedding') {
      models = getEmbeddingModels(type);
    } else {
      models = getModelsForProvider(type);
    }

    return res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching LLM models:', hivemindError);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to fetch LLM models'));
  }
});

export default router;
