import Debug from 'debug';
import { Router } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { ErrorUtils } from '@src/types/errors';
import { HTTP_STATUS } from '../../types/constants';
import { EmptyBodySchema } from '../../validation/schemas/usageTrackingSchema';
import { validateRequest } from '../../validation/validateRequest';
import { UsageTrackerService } from '../services/UsageTrackerService';
import { asyncErrorHandler } from '../../middleware/errorHandler';

const debug = Debug('app:webui:usage-tracking');
const router = Router();

const usageTracker = UsageTrackerService.getInstance();

/**
 * GET /api/usage-tracking/tools
 * Get usage metrics for all tools
 */
router.get('/tools', asyncErrorHandler(async (req, res) => {
  try {
    const metrics = usageTracker.getAllToolMetrics();
    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching tool metrics: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'TOOL_METRICS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/tools/:toolId
 * Get usage metrics for a specific tool
 */
router.get('/tools/:toolId', asyncErrorHandler(async (req, res) => {
  try {
    const { toolId } = req.params;
    const metrics = usageTracker.getToolMetrics(toolId);

    if (!metrics) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Tool metrics not found'));
    }

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching tool metrics: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'TOOL_METRICS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/providers
 * Get usage metrics for all providers
 */
router.get('/providers', asyncErrorHandler(async (req, res) => {
  try {
    const metrics = usageTracker.getAllProviderMetrics();
    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider metrics: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'PROVIDER_METRICS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/providers/:serverName
 * Get usage metrics for a specific provider
 */
router.get('/providers/:serverName', asyncErrorHandler(async (req, res) => {
  try {
    const { serverName } = req.params;
    const metrics = usageTracker.getProviderMetrics(serverName);

    if (!metrics) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Provider metrics not found'));
    }

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider metrics: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'PROVIDER_METRICS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/providers/:serverName/tools
 * Get usage metrics for tools from a specific provider
 */
router.get('/providers/:serverName/tools', asyncErrorHandler(async (req, res) => {
  try {
    const { serverName } = req.params;
    const metrics = usageTracker.getToolMetricsByProvider(serverName);

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching provider tool metrics: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'PROVIDER_TOOL_METRICS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/top-tools
 * Get top N most used tools
 */
router.get('/top-tools', asyncErrorHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getTopTools(limit);

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching top tools: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'TOP_TOOLS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/top-providers
 * Get top N most used providers
 */
router.get('/top-providers', asyncErrorHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getTopProviders(limit);

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching top providers: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'TOP_PROVIDERS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/recent-tools
 * Get recently used tools
 */
router.get('/recent-tools', asyncErrorHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const metrics = usageTracker.getRecentTools(limit);

    return res.json(ApiResponse.success(metrics));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching recent tools: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'RECENT_TOOLS_ERROR'
        )
      );
  }
}));

/**
 * GET /api/usage-tracking/stats
 * Get aggregate statistics
 */
router.get('/stats', asyncErrorHandler(async (req, res) => {
  try {
    const stats = usageTracker.getAggregateStats();

    return res.json(ApiResponse.success(stats));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error fetching aggregate stats: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'AGGREGATE_STATS_ERROR'
        )
      );
  }
}));

/**
 * DELETE /api/usage-tracking/clear
 * Clear all usage data
 */
router.delete('/clear', validateRequest(EmptyBodySchema), asyncErrorHandler(async (req, res) => {
  try {
    await usageTracker.clearAllData();

    return res.json(ApiResponse.success());
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    debug('Error clearing usage data: %O', hivemindError);

    return res
      .status(ErrorUtils.getStatusCode(hivemindError) || 500)
      .json(
        ApiResponse.error(
          ErrorUtils.getMessage(hivemindError),
          ErrorUtils.getCode(hivemindError) || 'CLEAR_DATA_ERROR'
        )
      );
  }
}));

export default router;
