import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import MCPProviderManager from '../../../config/MCPProviderManager';
import { HTTP_STATUS } from '../../../types/constants';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import type { MCPProviderConfig } from '../../../types/mcp';
import {
  CreateMCPProviderSchema,
  MCPProviderIdParamSchema,
  UpdateMCPProviderSchema,
} from '../../../validation/schemas/mcpSchema';
import { validateRequest } from '../../../validation/validateRequest';

const debug = Debug('app:webui:mcp:providers');
const router = Router();
const mcpProviderManager = MCPProviderManager;
router.get('/providers', asyncErrorHandler(async (req, res) => {
  try {
    const providers = mcpProviderManager.getAllProviders();
    const statuses = mcpProviderManager.getAllProviderStatuses();

    const providersWithStatus = providers.map((provider: MCPProviderConfig) => ({
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
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP providers:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDERS_GET_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// GET /api/mcp/providers/:id - Get MCP provider by ID
router.get('/providers/:id', validateRequest(MCPProviderIdParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const provider = mcpProviderManager.getProvider(id);

    if (!provider) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
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
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_GET_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/providers - Create new MCP provider
router.post('/providers', validateRequest(CreateMCPProviderSchema), asyncErrorHandler(async (req, res) => {
  try {
    const providerConfig: MCPProviderConfig = req.body;

    // Idempotency check: return existing if it exists by ID
    const existingProvider = mcpProviderManager.getProvider(providerConfig.id);
    if (existingProvider) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: existingProvider,
        message: 'Provider already exists',
      });
    }

    // Validate configuration
    const validation = mcpProviderManager.validateProviderConfig(providerConfig);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid MCP provider configuration',
        details: validation.errors,
      });
    }

    await mcpProviderManager.addProvider(providerConfig);

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: providerConfig,
      warnings: validation.warnings,
      suggestions: validation.suggestions,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to create MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_CREATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// PUT /api/mcp/providers/:id - Update MCP provider
router.put('/providers/:id', validateRequest(UpdateMCPProviderSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates: Partial<MCPProviderConfig> = req.body;

    // Validate updates
    const existingProvider = mcpProviderManager.getProvider(id);
    if (!existingProvider) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    const updatedConfig = { ...existingProvider, ...updates };
    const validation = mcpProviderManager.validateProviderConfig(updatedConfig);

    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
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
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to update MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_UPDATE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// DELETE /api/mcp/providers/:id - Delete MCP provider
router.delete('/providers/:id', validateRequest(MCPProviderIdParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'MCP provider already deleted or not found',
      });
    }

    await mcpProviderManager.removeProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider deleted successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to delete MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_DELETE_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/providers/:id/start - Start MCP provider
router.post('/providers/:id/start', validateRequest(MCPProviderIdParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    await mcpProviderManager.startProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider started successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to start MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_START_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/providers/:id/stop - Stop MCP provider
router.post('/providers/:id/stop', validateRequest(MCPProviderIdParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    await mcpProviderManager.stopProvider(id);

    return res.json({
      success: true,
      message: 'MCP provider stopped successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to stop MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_STOP_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// POST /api/mcp/providers/:id/test - Test MCP provider
router.post('/providers/:id/test', validateRequest(MCPProviderIdParamSchema), asyncErrorHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = mcpProviderManager.getProvider(id);
    if (!provider) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'MCP provider not found',
      });
    }

    const testResult = await mcpProviderManager.testProvider(id);

    return res.json({
      success: true,
      data: testResult,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to test MCP provider:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_TEST_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// GET /api/mcp/providers/templates - Get MCP provider templates
router.get('/providers/templates', asyncErrorHandler(async (req, res) => {
  try {
    const templates = mcpProviderManager.getTemplates();

    return res.json({
      success: true,
      data: templates,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider templates:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_TEMPLATES_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

// GET /api/mcp/providers/stats - Get MCP provider statistics
router.get('/providers/stats', asyncErrorHandler(async (req, res) => {
  try {
    const stats = mcpProviderManager.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    debug('Failed to get MCP provider statistics:', {
      message: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError),
      type: errorInfo.type,
      severity: errorInfo.severity,
    });

    return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
      success: false,
      error: ErrorUtils.getMessage(hivemindError),
      code: ErrorUtils.getCode(hivemindError) || 'MCP_PROVIDER_STATS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}));

export default router;
