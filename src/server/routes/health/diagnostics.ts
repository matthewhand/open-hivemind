import * as os from 'os';
import * as process from 'process';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { MetricsCollector } from '../../../monitoring/MetricsCollector';
import ApiMonitorService from '../../../services/ApiMonitorService';
import { HEALTH_THRESHOLDS, HTTP_STATUS } from '../../../types/constants';
import { ErrorLogger } from '../../../utils/errorLogger';
import { globalRecoveryManager } from '../../../utils/errorRecovery';
import {
  ApiEndpointConfigSchema,
  CleanupConfigSchema,
  EndpointIdParamSchema,
} from '../../../validation/schemas/healthSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { optionalAuth } from '../../middleware/auth';
import { calculateErrorRate, getErrorHealthStatus, getErrorRecommendations, getRecoveryHealthStatus, getRecoveryRecommendations, detectErrorSpikes, detectErrorCorrelations, detectErrorAnomalies, generatePatternRecommendations } from './helpers';

const router = Router();

// API endpoints monitoring
router.get('/api-endpoints', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  const statuses = apiMonitor.getAllStatuses();
  const overallHealth = apiMonitor.getOverallHealth();

  return res.json({
    overall: overallHealth,
    endpoints: statuses,
    timestamp: new Date().toISOString(),
  });
});

// Get specific endpoint status
router.get('/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  const status = apiMonitor.getEndpointStatus(req.params.id);

  if (!status) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Endpoint not found',
      message: `No endpoint found with ID: ${req.params.id}`,
    });
  }

  return res.json({
    endpoint: status,
    timestamp: new Date().toISOString(),
  });
});

// Cleanup endpoint (admin only)
router.post('/cleanup', validateRequest(CleanupConfigSchema), (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    const config = req.body;

    if (!config || Object.keys(config).length === 0) {
      return res.json({
        message: 'No endpoint data provided',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required fields
    if (!config.id || !config.name || !config.url) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing required fields',
        message: 'id, name, and url are required',
      });
    }

    // Set defaults
    config.method = config.method || 'GET';
    config.enabled = config.enabled !== false;
    config.interval = config.interval || 60000; // 1 minute
    config.timeout = config.timeout || 10000; // 10 seconds
    config.retries = config.retries || 3;
    config.retryDelay = config.retryDelay || 1000; // 1 second

    apiMonitor.addEndpoint(config);

    return res.status(HTTP_STATUS.CREATED).json({
      message: 'Endpoint added successfully',
      endpoint: apiMonitor.getEndpoint(config.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Failed to add endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Add new endpoint to monitor
router.post('/api-endpoints', validateRequest(ApiEndpointConfigSchema), (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    const config = req.body;

    if (!config || Object.keys(config).length === 0) {
      return res.json({
        message: 'No endpoint data provided',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required fields
    if (!config.id || !config.name || !config.url) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing required fields',
        message: 'id, name, and url are required',
      });
    }

    // Set defaults
    config.method = config.method || 'GET';
    config.enabled = config.enabled !== false;
    config.interval = config.interval || 60000; // 1 minute
    config.timeout = config.timeout || 10000; // 10 seconds
    config.retries = config.retries || 3;
    config.retryDelay = config.retryDelay || 1000; // 1 second

    apiMonitor.addEndpoint(config);

    return res.status(HTTP_STATUS.CREATED).json({
      message: 'Endpoint added successfully',
      endpoint: apiMonitor.getEndpoint(config.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Failed to add endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Update endpoint configuration
router.put('/api-endpoints/:id', validateRequest(EndpointIdParamSchema), (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    apiMonitor.updateEndpoint(req.params.id, req.body);

    return res.json({
      message: 'Endpoint updated successfully',
      endpoint: apiMonitor.getEndpoint(req.params.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Failed to update endpoint',
      message: error instanceof Error ? error.message : 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
  }
});

// Remove endpoint from monitoring
router.delete('/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    const endpoint = apiMonitor.getEndpoint(req.params.id);
    if (!endpoint) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Failed to remove endpoint',
        message: 'Endpoint not found',
        timestamp: new Date().toISOString(),
      });
    }
    apiMonitor.removeEndpoint(req.params.id);

    return res.json({
      message: 'Endpoint removed successfully',
      removedEndpoint: endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: 'Failed to remove endpoint',
      message: error instanceof Error ? error.message : 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start monitoring all endpoints
router.post('/api-endpoints/start', validateRequest(CleanupConfigSchema), (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  apiMonitor.startAllMonitoring();

  return res.json({
    message: 'Started monitoring all endpoints',
    timestamp: new Date().toISOString(),
  });
});

// Stop monitoring all endpoints
router.post('/api-endpoints/stop', validateRequest(CleanupConfigSchema), (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  apiMonitor.stopAllMonitoring();

  return res.json({
    message: 'Stopped monitoring all endpoints',
    timestamp: new Date().toISOString(),
  });
});

router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isParseError = err instanceof SyntaxError || err?.type === 'entity.parse.failed';
  if (isParseError && req.path?.startsWith('/api-endpoints')) {
    const method = typeof req.method === 'string' ? req.method.toUpperCase() : req.method;
    if (method === 'PUT') {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Failed to update endpoint',
        message: 'Endpoint not found or payload invalid',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Invalid JSON payload',
      message: 'Request body could not be parsed',
      timestamp: new Date().toISOString(),
    });
  }

  return next(err);
});


// Error-specific health endpoints
router.get('/errors', (req, res) => {
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recentErrors = errorLogger.getRecentErrorCount(60000); // Last minute
  const metrics = MetricsCollector.getInstance().getMetrics();

  const errorHealthData = {
    timestamp: new Date().toISOString(),
    errors: {
      total: metrics.errors,
      recent: recentErrors,
      rate: calculateErrorRate(recentErrors, 60),
      byType: errorStats,
      trends: {
        lastMinute: errorLogger.getRecentErrorCount(60000),
        last5Minutes: errorLogger.getRecentErrorCount(300000),
        last15Minutes: errorLogger.getRecentErrorCount(900000),
      },
    },
    health: {
      status: getErrorHealthStatus(recentErrors),
      recommendations: getErrorRecommendations(errorStats, recentErrors),
    },
  };

  return res.json(errorHealthData);
});


// Recovery system health endpoint
router.get('/recovery', (req, res) => {
  const recoveryStats = globalRecoveryManager.getAllStats();
  const errorLogger = ErrorLogger.getInstance();

  const recoveryHealthData = {
    timestamp: new Date().toISOString(),
    circuitBreakers: Object.entries(recoveryStats).map(([key, stats]) => ({
      operation: key,
      state: stats.circuitBreaker.state,
      failureCount: stats.circuitBreaker.failureCount,
      successCount: stats.circuitBreaker.successCount,
      fallbacks: stats.fallbacks,
    })),
    health: {
      status: getRecoveryHealthStatus(recoveryStats),
      recommendations: getRecoveryRecommendations(recoveryStats),
    },
    errorLogger: {
      config: errorLogger.getConfig(),
      stats: errorLogger.getErrorStats(),
    },
  };

  return res.json(recoveryHealthData);
});


// Error patterns and anomalies endpoint
router.get('/errors/patterns', (req, res) => {
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recentErrors = errorLogger.getRecentErrorCount(60000);

  // ⚡ Bolt Optimization: Calculate total count once instead of inside the map loop
  // This changes an O(n²) operation into an O(n) operation when computing error percentages
  const totalCount = Object.values(errorStats).reduce(
    (sum: number, val: any) => sum + (val as number),
    0
  );

  const patternsData = {
    timestamp: new Date().toISOString(),
    patterns: {
      errorTypes: Object.entries(errorStats)
        .sort(([, a]: [string, any], [, b]: [string, any]) => (b as number) - (a as number))
        .map(([type, count]) => {
          return {
            type,
            count: count as number,
            percentage:
              (totalCount as unknown as number) > 0
                ? ((count as number) / (totalCount as unknown as number)) * 100
                : 0,
          };
        }),
      spikes: detectErrorSpikes(errorStats),
      correlations: detectErrorCorrelations(errorStats),
      anomalies: detectErrorAnomalies(recentErrors, errorStats),
    },
    recommendations: generatePatternRecommendations(errorStats, recentErrors),
  };

  return res.json(patternsData);
});


export default router;
