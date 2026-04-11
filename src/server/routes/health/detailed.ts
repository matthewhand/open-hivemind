import os from 'os';
import process from 'process';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { MetricsCollector } from '../../../monitoring/MetricsCollector';
import ApiMonitorService from '../../../services/ApiMonitorService';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorLogger } from '../../../utils/errorLogger';
import { globalRecoveryManager } from '../../../utils/errorRecovery';
import {
  ApiEndpointConfigSchema,
  CleanupConfigSchema,
  EndpointIdParamSchema,
} from '../../../validation/schemas/healthSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { optionalAuth } from '../../middleware/auth';
import { calculateErrorRate, calculateHealthStatus } from './helpers';

const router = Router();

// Detailed health check - requires authentication for full details
router.get('/detailed', optionalAuth, (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const metrics = MetricsCollector.getInstance().getMetrics();

  // Calculate overall health status
  const recentErrors = ErrorLogger.getInstance().getRecentErrorCount(60000);
  const healthStatus = calculateHealthStatus(memoryUsage, recentErrors, metrics);

  // Sanitized response for unauthenticated users
  if (!req.user) {
    const sanitizedHealthData = {
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      uptime: uptime,
    };
    return res.json(sanitizedHealthData);
  }

  // Full detailed response for authenticated users
  const cpuUsage = process.cpuUsage();
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recoveryStats = globalRecoveryManager.getAllStats();

  const healthData = {
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'healthy' },
      configuration: { status: 'healthy' },
      services: { status: 'healthy' },
    },
    uptime: uptime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // %
      percentage:
        (Math.round(memoryUsage.heapUsed / 1024 / 1024) /
          Math.round(memoryUsage.heapTotal / 1024 / 1024)) *
        100, // % based on rounded values
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // microseconds to milliseconds
      system: Math.round(cpuUsage.system / 1000), // microseconds to milliseconds
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
    },
    errors: {
      total: metrics.errors,
      recent: recentErrors,
      rate: calculateErrorRate(recentErrors, 60), // errors per minute
      byType: errorStats,
      health: healthStatus.errorHealth,
    },
    recovery: {
      circuitBreakers: Object.keys(recoveryStats).length,
      activeFallbacks: Object.values(recoveryStats).reduce(
        (sum, stats) => sum + stats.fallbacks,
        0
      ),
      stats: recoveryStats,
    },
    performance: {
      messagesProcessed: metrics.messagesProcessed,
      averageResponseTime:
        metrics.responseTime.length > 0
          ? metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length
          : 0,
      llmUsage: metrics.llmTokenUsage,
    },
  };

  // Append pipeline tracer stats if the pipeline has been registered
  try {
    const { getActiveTracer } = require('../../../observability');
    const tracer = getActiveTracer();
    if (tracer) {
      const stats = tracer.getStats();
      const recentTraces = tracer.getCompletedTraces(5);
      (healthData as any).pipeline = {
        totalTraces: stats.totalTraces,
        avgDurationMs: stats.avgDurationMs,
        stageAvgMs: stats.stageAvgMs,
        errorRate: stats.errorRate,
        recentTraces: recentTraces.length,
      };
    }
  } catch {
    // Pipeline tracer not available — skip
  }

  return res.json(healthData);
});

// Service-level health check endpoint for the health check widget
router.get('/detailed/services', optionalAuth, async (_req: Request, res: Response) => {
  const services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    lastChecked: string;
    details: string;
  }> = [];

  const now = new Date().toISOString();

  // Check Database connectivity
  const dbStart = Date.now();
  try {
    const dbManager = require('../../../database/DatabaseManager').DatabaseManager.getInstance();
    const isConnected = dbManager.isConnected();
    services.push({
      name: 'Database',
      status: isConnected ? 'healthy' : 'down',
      latencyMs: Date.now() - dbStart,
      lastChecked: now,
      details: isConnected ? 'Connected and responding' : 'Database connection lost',
    });
  } catch {
    services.push({
      name: 'Database',
      status: 'down',
      latencyMs: Date.now() - dbStart,
      lastChecked: now,
      details: 'Database unavailable or not configured',
    });
  }

  // Check LLM providers
  const llmStart = Date.now();
  try {
    const { ProviderRegistry } = require('../../../registries/providerRegistry');
    const registry = ProviderRegistry.getInstance();
    const llmProviders = registry.getLlmProviders?.() || [];
    const activeLlm = llmProviders.filter((p: any) => p.status === 'active' || p.connected);
    const llmCount = llmProviders.length;
    const activeCount = activeLlm.length;
    const llmStatus =
      llmCount === 0
        ? 'down'
        : activeCount === llmCount
          ? 'healthy'
          : activeCount > 0
            ? 'degraded'
            : 'down';
    services.push({
      name: 'LLM Providers',
      status: llmStatus as 'healthy' | 'degraded' | 'down',
      latencyMs: Date.now() - llmStart,
      lastChecked: now,
      details: `${activeCount}/${llmCount} providers active`,
    });
  } catch {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasAny = hasOpenAI || hasAnthropic;
    services.push({
      name: 'LLM Providers',
      status: hasAny ? 'healthy' : 'down',
      latencyMs: Date.now() - llmStart,
      lastChecked: now,
      details: hasAny ? 'Provider API key(s) configured' : 'No LLM providers configured',
    });
  }

  // Check Message providers
  const msgStart = Date.now();
  try {
    const { ProviderRegistry } = require('../../../registries/providerRegistry');
    const registry = ProviderRegistry.getInstance();
    const msgProviders = registry.getMessageProviders?.() || [];
    const activeMsg = msgProviders.filter((p: any) => p.status === 'active' || p.connected);
    const msgCount = msgProviders.length;
    const activeMsgCount = activeMsg.length;
    const msgStatus =
      msgCount === 0
        ? 'down'
        : activeMsgCount === msgCount
          ? 'healthy'
          : activeMsgCount > 0
            ? 'degraded'
            : 'down';
    services.push({
      name: 'Message Providers',
      status: msgStatus as 'healthy' | 'degraded' | 'down',
      latencyMs: Date.now() - msgStart,
      lastChecked: now,
      details: `${activeMsgCount}/${msgCount} providers connected`,
    });
  } catch {
    const hasDiscord = !!process.env.DISCORD_BOT_TOKEN;
    const hasSlack = !!process.env.SLACK_BOT_TOKEN;
    const hasAny = hasDiscord || hasSlack;
    services.push({
      name: 'Message Providers',
      status: hasAny ? 'healthy' : 'down',
      latencyMs: Date.now() - msgStart,
      lastChecked: now,
      details: hasAny ? 'Message provider token(s) configured' : 'No message providers configured',
    });
  }

  // Check Memory provider
  const memStart = Date.now();
  try {
    const { ProviderRegistry } = require('../../../registries/providerRegistry');
    const registry = ProviderRegistry.getInstance();
    const memProviders = registry.getMemoryProviders?.() || [];
    const activeMem = memProviders.filter((p: any) => p.status === 'active' || p.connected);
    const memStatus =
      memProviders.length === 0 ? 'down' : activeMem.length > 0 ? 'healthy' : 'down';
    services.push({
      name: 'Memory Provider',
      status: memStatus as 'healthy' | 'degraded' | 'down',
      latencyMs: Date.now() - memStart,
      lastChecked: now,
      details:
        activeMem.length > 0
          ? `${activeMem.length} provider(s) active`
          : 'No memory providers active',
    });
  } catch {
    const hasMem0 = !!process.env.MEM0_API_KEY || !!process.env.MEM0_BASE_URL;
    services.push({
      name: 'Memory Provider',
      status: hasMem0 ? 'healthy' : 'down',
      latencyMs: Date.now() - memStart,
      lastChecked: now,
      details: hasMem0 ? 'Memory provider configured' : 'No memory provider configured',
    });
  }

  return res.json({ services });
});

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

export default router;
