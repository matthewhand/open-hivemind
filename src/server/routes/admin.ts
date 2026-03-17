import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { getTrustedMcpReposConfig } from '../../config/trustedMcpRepos';
import { DatabaseManager } from '../../database/DatabaseManager';
import { MCPService } from '../../mcp/MCPService';
import ApiMonitorService from '../../services/ApiMonitorService';
import { webUIStorage } from '../../storage/webUIStorage';
import { getRelevantEnvVars } from '../../utils/envUtils';
import { isSafeUrl } from '../../utils/ssrfGuard';
import {
  LlmProviderSchema,
  McpServerConnectSchema,
  McpServerDisconnectSchema,
  McpServerTestSchema,
  MessengerProviderSchema,
  PersonaKeyParamSchema,
  PersonaSchema,
  ServerNameParamSchema,
  ToggleIdParamSchema,
  ToggleProviderSchema,
  ToolUsageGuardSchema,
  UpdateLlmProviderSchema,
  UpdateMessengerProviderSchema,
  UpdatePersonaSchema,
  UpdateToolUsageGuardSchema,
} from '../../validation/schemas/adminSchema';
import { validateRequest } from '../../validation/validateRequest';
import activityRouter from './activity';
import agentsRouter from './agents';
import guardProfilesRouter from './guardProfiles';
import mcpRouter from './mcp';

const router = Router();
const debug = Debug('app:webui:admin');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply authentication middleware to all admin routes (skip in tests)
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

// Apply rate limiting to configuration endpoints
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

// Apply rate limiting to sensitive configuration operations
router.use('/', configRateLimit);

// Mount sub-routes
router.use('/agents', agentsRouter);
router.use('/mcp', mcpRouter);
router.use('/activity', activityRouter);
router.use('/guard-profiles', guardProfilesRouter);

/**
 * @openapi
 * /api/admin/tool-usage-guards:
 *   get:
 *     summary: Retrieve tool usage guards
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of tool usage guards
 */
router.get('/tool-usage-guards', (req: Request, res: Response) => {
  try {
    // Mock data for tool usage guards
    const guards = [
      {
        id: 'guard1',
        name: 'Owner Only for Summarize',
        toolName: 'summarize',
        guardType: 'owner_only',
        config: { ownerOnly: true },
        isActive: true,
      },
      {
        id: 'guard2',
        name: 'Specific Users for Translate',
        toolName: 'translate',
        guardType: 'user_list',
        config: { allowedUsers: ['user1', 'user2'] },
        isActive: false,
      },
      {
        id: 'guard3',
        name: 'Role-based for Generate',
        toolName: 'generate',
        guardType: 'role_based',
        config: { allowedRoles: ['admin', 'moderator'] },
        isActive: true,
      },
    ];

    return res.json({
      success: true,
      data: { guards },
      message: 'Tool usage guards retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve tool usage guards',
      message: error.message || 'An error occurred while retrieving tool usage guards',
    });
  }
});

/**
 * @openapi
 * /api/admin/tool-usage-guards:
 *   post:
 *     summary: Create a new tool usage guard
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               toolId: { type: string }
 *               guardType: { type: string, enum: [owner_only, user_list, role_based] }
 *             required: [name, toolId, guardType]
 *     responses:
 *       200:
 *         description: Created tool usage guard
 */
router.post(
  '/tool-usage-guards',
  configRateLimit,
  validateRequest(ToolUsageGuardSchema),
  (req: Request, res: Response) => {
    try {
      const { name, description, toolId, guardType, allowedUsers, allowedRoles, isActive } =
        req.body;

      // In a real implementation, this would save to database
      const newGuard = {
        id: `guard${Date.now()}`,
        name,
        description,
        toolId,
        guardType,
        allowedUsers: allowedUsers || [],
        allowedRoles: allowedRoles || [],
        isActive: isActive !== false,
      };

      return res.json({
        success: true,
        data: { guard: newGuard },
        message: 'Tool usage guard created successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to create tool usage guard',
        message: error.message || 'An error occurred while creating tool usage guard',
      });
    }
  }
);

// PUT /tool-usage-guards/:id - Update an existing tool usage guard
router.put(
  '/tool-usage-guards/:id',
  configRateLimit,
  validateRequest(UpdateToolUsageGuardSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, toolId, guardType, allowedUsers, allowedRoles, isActive } =
        req.body;

      // In a real implementation, this would update in database
      const updatedGuard = {
        id,
        name,
        description,
        toolId,
        guardType,
        allowedUsers: allowedUsers || [],
        allowedRoles: allowedRoles || [],
        isActive: isActive !== false,
      };

      return res.json({
        success: true,
        data: { guard: updatedGuard },
        message: 'Tool usage guard updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update tool usage guard',
        message: error.message || 'An error occurred while updating tool usage guard',
      });
    }
  }
);

/**
 * @openapi
 * /api/admin/tool-usage-guards/{id}:
 *   delete:
 *     summary: Delete a tool usage guard
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted tool usage guard
 */
router.delete(
  '/tool-usage-guards/:id',
  configRateLimit,
  validateRequest(ToggleIdParamSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // In a real implementation, this would delete from database
      // For now, just return success

      return res.json({
        success: true,
        message: 'Tool usage guard deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to delete tool usage guard',
        message: error.message || 'An error occurred while deleting tool usage guard',
      });
    }
  }
);

// POST /tool-usage-guards/:id/toggle - Toggle tool usage guard active status
router.post(
  '/tool-usage-guards/:id/toggle',
  configRateLimit,
  validateRequest(ToggleProviderSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // In a real implementation, this would update in database
      // For now, just return success

      return res.json({
        success: true,
        message: 'Tool usage guard status updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update guard status',
        message: error.message || 'An error occurred while updating guard status',
      });
    }
  }
);
// GET /llm-providers - Get all LLM providers
router.get('/llm-providers', (req: Request, res: Response) => {
  try {
    const providers = webUIStorage.getLlmProviders();
    return res.json({
      success: true,
      data: { providers },
      message: 'LLM providers retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve LLM providers',
      message: error.message || 'An error occurred while retrieving LLM providers',
    });
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
  (req: Request, res: Response) => {
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
      webUIStorage.saveLlmProvider(newProvider);

      // Sync monitor endpoints
      ApiMonitorService.getInstance().syncLlmEndpoints();

      return res.json({
        success: true,
        data: { provider: newProvider },
        message: 'LLM provider created successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to create LLM provider',
        message: error.message || 'An error occurred while creating LLM provider',
      });
    }
  }
);

// PUT /llm-providers/:id - Update an existing LLM provider
router.put(
  '/llm-providers/:id',
  validateRequest(UpdateLlmProviderSchema),
  (req: Request, res: Response) => {
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
      webUIStorage.saveLlmProvider(updatedProvider);

      // Sync monitor endpoints
      ApiMonitorService.getInstance().syncLlmEndpoints();

      return res.json({
        success: true,
        data: { provider: updatedProvider },
        message: 'LLM provider updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update LLM provider',
        message: error.message || 'An error occurred while updating LLM provider',
      });
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
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      webUIStorage.deleteLlmProvider(id);

      // Sync monitor endpoints
      ApiMonitorService.getInstance().syncLlmEndpoints();

      return res.json({
        success: true,
        message: 'LLM provider deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to delete LLM provider',
        message: error.message || 'An error occurred while deleting LLM provider',
      });
    }
  }
);

// POST /llm-providers/:id/toggle - Toggle LLM provider active status
router.post(
  '/llm-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = webUIStorage.getLlmProviders();
      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        webUIStorage.saveLlmProvider(provider);

        // Sync monitor endpoints
        ApiMonitorService.getInstance().syncLlmEndpoints();
      } else {
        return res.status(404).json({
          error: 'Provider not found',
          message: `LLM provider with ID ${id} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'LLM provider status updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update provider status',
        message: error.message || 'An error occurred while updating provider status',
      });
    }
  }
);

// GET /messenger-providers - Get all messenger providers
router.get('/messenger-providers', (req: Request, res: Response) => {
  try {
    const providers = webUIStorage.getMessengerProviders();
    return res.json({
      success: true,
      data: { providers },
      message: 'Messenger providers retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve messenger providers',
      message: error.message || 'An error occurred while retrieving messenger providers',
    });
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
  (req: Request, res: Response) => {
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
      webUIStorage.saveMessengerProvider(newProvider);

      return res.json({
        success: true,
        data: { provider: newProvider },
        message: 'Messenger provider created successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to create messenger provider',
        message: error.message || 'An error occurred while creating messenger provider',
      });
    }
  }
);

// PUT /messenger-providers/:id - Update an existing messenger provider
router.put(
  '/messenger-providers/:id',
  validateRequest(UpdateMessengerProviderSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;

      // Validation
      if (!name || !type || !config) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Name, type, and config are required',
        });
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
      webUIStorage.saveMessengerProvider(updatedProvider);

      return res.json({
        success: true,
        data: { provider: updatedProvider },
        message: 'Messenger provider updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update messenger provider',
        message: error.message || 'An error occurred while updating messenger provider',
      });
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
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      webUIStorage.deleteMessengerProvider(id);

      return res.json({
        success: true,
        message: 'Messenger provider deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to delete messenger provider',
        message: error.message || 'An error occurred while deleting messenger provider',
      });
    }
  }
);

// POST /messenger-providers/:id/toggle - Toggle messenger provider active status
router.post(
  '/messenger-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = webUIStorage.getMessengerProviders();
      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        webUIStorage.saveMessengerProvider(provider);
      } else {
        return res.status(404).json({
          error: 'Provider not found',
          message: `Messenger provider with ID ${id} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'Messenger provider status updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update provider status',
        message: error.message || 'An error occurred while updating provider status',
      });
    }
  }
);

/**
 * @openapi
 * /api/admin/personas:
 *   get:
 *     summary: Retrieve personas
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of personas
 */
router.get('/personas', (req: Request, res: Response) => {
  try {
    // Get personas from persistent storage
    const storedPersonas = webUIStorage.getPersonas();

    // Default personas - in a real implementation, these would be stored in a database
    const defaultPersonas = [
      {
        key: 'default',
        name: 'Default Assistant',
        systemPrompt: 'You are a helpful AI assistant.',
      },
      {
        key: 'developer',
        name: 'Developer Assistant',
        systemPrompt: 'You are an expert software developer assistant.',
      },
      {
        key: 'support',
        name: 'Support Agent',
        systemPrompt: 'You are a customer support agent.',
      },
    ];

    // Combine stored and default personas
    const allPersonas = [...storedPersonas, ...defaultPersonas];

    return res.json({
      success: true,
      data: { personas: allPersonas },
      message: 'Personas retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve personas',
      message: error.message || 'An error occurred while retrieving personas',
    });
  }
});

/**
 * @openapi
 * /api/admin/personas:
 *   post:
 *     summary: Save a new persona
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key: { type: string }
 *               name: { type: string }
 *               systemPrompt: { type: string }
 *             required: [key, name, systemPrompt]
 *     responses:
 *       200:
 *         description: Created persona
 */
router.post('/personas', validateRequest(PersonaSchema), (req: Request, res: Response) => {
  try {
    const { key, name, systemPrompt } = req.body;

    // Save to persistent storage
    webUIStorage.savePersona({ key, name, systemPrompt });

    return res.json({
      success: true,
      message: 'Persona created successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to create persona',
      message: error.message || 'An error occurred while creating persona',
    });
  }
});

// Update an existing persona
router.put(
  '/personas/:key',
  validateRequest(UpdatePersonaSchema),
  (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { name, systemPrompt } = req.body;

      // Save to persistent storage
      webUIStorage.savePersona({ key, name, systemPrompt });

      return res.json({
        success: true,
        message: 'Persona updated successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to update persona',
        message: error.message || 'An error occurred while updating persona',
      });
    }
  }
);

// Delete a persona
router.delete(
  '/personas/:key',
  validateRequest(PersonaKeyParamSchema),
  (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      // Delete from persistent storage
      webUIStorage.deletePersona(key);

      return res.json({
        success: true,
        message: 'Persona deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to delete persona',
        message: error.message || 'An error occurred while deleting persona',
      });
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
        return res.status(400).json({
          error: 'Validation error',
          message: 'Server URL is required',
        });
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Server URL must be a valid URL',
        });
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(403).json({
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
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to connect to MCP server',
        message: error.message || 'An error occurred while connecting to MCP server',
      });
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
        return res.status(400).json({
          error: 'Validation error',
          message: 'Server URL and name are required',
        });
      }

      // Validate URL format
      try {
        new URL(serverUrl);
      } catch {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Server URL must be a valid URL',
        });
      }

      // Security Check: SSRF Protection
      if (!(await isSafeUrl(serverUrl))) {
        return res.status(403).json({
          error: 'Security Warning',
          message: 'Target URL is blocked for security reasons (private/local network access).',
        });
      }

      // Sanitize API key for storage
      const sanitizedApiKey = apiKey ? apiKey.substring(0, 3) + '***' : '';

      const mcpService = MCPService.getInstance();
      const tools = await mcpService.connectToServer({ serverUrl, apiKey, name });

      // Save to persistent storage with sanitized API key
      webUIStorage.saveMcp({ name, serverUrl, apiKey: sanitizedApiKey });

      return res.json({
        success: true,
        data: { tools },
        message: `Successfully connected to MCP server: ${name}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to connect to MCP server',
        message: error.message || 'An error occurred while connecting to MCP server',
      });
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
        return res.status(400).json({
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
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to disconnect from MCP server',
        message: error.message || 'An error occurred while disconnecting from MCP server',
      });
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
      webUIStorage.deleteMcp(name);

      return res.json({
        success: true,
        message: `Successfully deleted MCP server: ${name}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to delete MCP server',
        message: error.message || 'An error occurred while deleting MCP server',
      });
    }
  }
);

// Get all connected MCP servers
router.get('/mcp-servers', (req: Request, res: Response) => {
  try {
    const mcpService = MCPService.getInstance();
    const servers = mcpService.getConnectedServers();
    const trustConfig = getTrustedMcpReposConfig();

    // Get stored MCP server configurations
    const storedMcps = webUIStorage.getMcps();

    return res.json({
      success: true,
      data: {
        servers,
        configurations: storedMcps,
        trustedRepositories: trustConfig.trustedRepositories,
        cautionRepositories: trustConfig.cautionRepositories,
        trustSettings: trustConfig.settings,
      },
      message: 'Connected MCP servers retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve MCP servers',
      message: error.message || 'An error occurred while retrieving MCP servers',
    });
  }
});

// Get tools from a specific MCP server
router.get(
  '/mcp-servers/:name/tools',
  validateRequest(ServerNameParamSchema),
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const mcpService = MCPService.getInstance();
      const tools = mcpService.getToolsFromServer(name);

      if (!tools) {
        return res.status(404).json({
          error: 'Server not found',
          message: `MCP server ${name} not found or not connected`,
        });
      }

      return res.json({
        success: true,
        data: { tools },
        message: `Tools retrieved successfully from MCP server: ${name}`,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: 'Failed to retrieve tools',
        message: error.message || 'An error occurred while retrieving tools',
      });
    }
  }
);

// Get environment variable overrides
router.get('/env-overrides', (req: Request, res: Response) => {
  try {
    const envVars = getRelevantEnvVars();

    return res.json({
      success: true,
      data: { envVars },
      message: 'Environment variable overrides retrieved successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to retrieve environment variable overrides',
      message: error.message || 'An error occurred while retrieving environment variable overrides',
    });
  }
});

// GET /providers - Get available providers
router.get('/providers', async (req: Request, res: Response) => {
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

    return res.json({
      messageProviders,
      llmProviders,
    });
  } catch (error) {
    debug('Error fetching providers:', error);
    return res.status(500).json({ error: 'Failed to fetch providers' });
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

    return res.json({ systemInfo });
  } catch (error) {
    debug('Error fetching system info:', error);
    return res.status(500).json({ error: 'Failed to fetch system info' });
  }
});

export default router;
