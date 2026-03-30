import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { HTTP_STATUS } from '../../types/constants';
import { UsageTrackerService } from '../services/UsageTrackerService';
import { ApiResponse } from '../utils/apiResponse';

const debug = Debug('app:webui:usage-tracking');
const router = Router();

const usageTracker = UsageTrackerService.getInstance();

/**
 * GET /api/usage-tracking/tools
 * Get usage metrics for all tools
 */
router.get('/tools', async (req, res) => {
  try {
    const metrics = usageTracker.getAllToolMetrics();
    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching tool metrics: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'TOOL_METRICS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/tools/:toolId
 * Get usage metrics for a specific tool
 */
router.get('/tools/:toolId', async (req, res) => {
  try {
    const { toolId } = req.params;
    const metrics = usageTracker.getToolMetrics(toolId);

    if (!metrics) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Tool metrics not found',
      });
    }

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching tool metrics: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'TOOL_METRICS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/providers
 * Get usage metrics for all providers
 */
router.get('/providers', async (req, res) => {
  try {
    const metrics = usageTracker.getAllProviderMetrics();
    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider metrics: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'PROVIDER_METRICS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/providers/:serverName
 * Get usage metrics for a specific provider
 */
router.get('/providers/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const metrics = usageTracker.getProviderMetrics(serverName);

    if (!metrics) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'Provider metrics not found',
      });
    }

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider metrics: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'PROVIDER_METRICS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/providers/:serverName/tools
 * Get usage metrics for tools from a specific provider
 */
router.get('/providers/:serverName/tools', async (req, res) => {
  try {
    const { serverName } = req.params;
    const metrics = usageTracker.getToolMetricsByProvider(serverName);

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider tool metrics: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'PROVIDER_TOOL_METRICS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/top-tools
 * Get top N most used tools
 */
router.get('/top-tools', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getTopTools(limit);

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching top tools: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'TOP_TOOLS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/top-providers
 * Get top N most used providers
 */
router.get('/top-providers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getTopProviders(limit);

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching top providers: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'TOP_PROVIDERS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/recent-tools
 * Get recently used tools
 */
router.get('/recent-tools', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getRecentTools(limit);

    return res.json(
      ApiResponse.success({
        success: true,
        data: metrics,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching recent tools: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'RECENT_TOOLS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/usage-tracking/stats
 * Get aggregate statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = usageTracker.getAggregateStats();

    return res.json(
      ApiResponse.success({
        success: true,
        data: stats,
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching aggregate stats: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'AGGREGATE_STATS_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/usage-tracking/clear
 * Clear all usage data
 */
router.delete('/clear', async (req, res) => {
  try {
    await usageTracker.clearAllData();

    return res.json(
      ApiResponse.success({
        success: true,
        message: 'All usage data cleared successfully',
      })
    );
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error clearing usage data: %O', hivemindError);

    return res.status(hivemindError.statusCode || 500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code || 'CLEAR_DATA_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
