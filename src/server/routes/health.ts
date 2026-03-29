import os from 'os';
import process from 'process';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { MetricsCollector } from '../../monitoring/MetricsCollector';
import ApiMonitorService from '../../services/ApiMonitorService';
import { HEALTH_THRESHOLDS, HTTP_STATUS } from '../../types/constants';
import { ErrorLogger } from '../../utils/errorLogger';
import { globalRecoveryManager } from '../../utils/errorRecovery';
import { optionalAuth } from '../middleware/auth';
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  let dbStatus = 'unknown';
  try {
    // Requires importing DatabaseManager at the top
    const dbManager = require('../../database/DatabaseManager').DatabaseManager.getInstance();
    dbStatus = dbManager.isConnected() ? 'healthy' : 'unhealthy';
  } catch (error) {
    dbStatus = 'error';
  }

  const status = dbStatus === 'healthy' ? 'healthy' : 'degraded';
  const statusCode = status === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.OK; // Even degraded, we return 200 for basic health. /ready will return HTTP_STATUS.SERVICE_UNAVAILABLE if not ready.

  return ApiResponse.success(res, undefined, statusCode, { status: status, timestamp: new Date().toISOString(), version: '1.0.0', uptime: process.uptime(), memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      }, system: {
        platform: process.platform,
        nodeVersion: process.version,
        processId: process.pid,
      } });
});

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
    const dbManager = require('../../database/DatabaseManager').DatabaseManager.getInstance();
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
    const { ProviderRegistry } = require('../../registries/ProviderRegistry');
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
    const { ProviderRegistry } = require('../../registries/ProviderRegistry');
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

  // Check Memory providers (from registry)
  const memStart = Date.now();
  try {
    const { ProviderRegistry } = require('../../registries/ProviderRegistry');
    const registry = ProviderRegistry.getInstance();
    const memProviders = registry.getMemoryProviders();
    const memCount = memProviders.size;
    if (memCount > 0) {
      services.push({
        name: 'Memory Provider',
        status: 'healthy',
        latencyMs: Date.now() - memStart,
        lastChecked: now,
        details: `${memCount} provider(s) registered`,
      });
    } else {
      // Fallback: env var hint
      const hasMem0 = !!process.env.MEM0_API_KEY || !!process.env.MEM0_BASE_URL;
      services.push({
        name: 'Memory Provider',
        status: hasMem0 ? 'healthy' : 'down',
        latencyMs: Date.now() - memStart,
        lastChecked: now,
        details: hasMem0 ? 'Memory provider configured (env)' : 'No memory provider configured',
      });
    }
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

  // Check Tool providers (from registry)
  const toolStart = Date.now();
  try {
    const { ProviderRegistry } = require('../../registries/ProviderRegistry');
    const registry = ProviderRegistry.getInstance();
    const toolProviders = registry.getToolProviders();
    const toolCount = toolProviders.size;
    if (toolCount > 0) {
      services.push({
        name: 'Tool Providers',
        status: 'healthy',
        latencyMs: Date.now() - toolStart,
        lastChecked: now,
        details: `${toolCount} provider(s) registered`,
      });
    } else {
      services.push({
        name: 'Tool Providers',
        status: 'down',
        latencyMs: Date.now() - toolStart,
        lastChecked: now,
        details: 'No tool providers configured',
      });
    }
  } catch {
    services.push({
      name: 'Tool Providers',
      status: 'down',
      latencyMs: Date.now() - toolStart,
      lastChecked: now,
      details: 'Tool provider registry unavailable',
    });
  }

  return res.json({ services });
});

// System metrics endpoint
router.get('/metrics', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metricsData = {
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // %
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
    },
    eventLoop: {
      delay: 0, // Would need actual event loop delay measurement
      utilization: 0, // Would need actual utilization calculation
    },
    requests: {
      total: 0, // Would need to implement request counter
      rate: 0, // Would need to implement rate calculation
    },
  };

  return res.json(metricsData);
});

// Configurable alert thresholds (inspired by EnhancedAlertManager patterns
// that were removed during dead code cleanup). Override via environment variables.
const ALERT_THRESHOLDS = {
  memoryWarning: parseInt(process.env.ALERT_MEMORY_WARNING || '80', 10),
  memoryCritical: parseInt(process.env.ALERT_MEMORY_CRITICAL || '95', 10),
  cpuWarning: parseInt(process.env.ALERT_CPU_WARNING || '80', 10),
  cpuCritical: parseInt(process.env.ALERT_CPU_CRITICAL || '95', 10),
  recentRestartSeconds: 30,
  errorRateWarning: parseFloat(process.env.ALERT_ERROR_RATE_WARNING || '5'),
};

// Alerts endpoint
router.get('/alerts', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const cpuUsage = process.cpuUsage();
  const uptime = process.uptime();

  const alerts = [];
  const now = new Date().toISOString();

  // Check for high memory usage with tiered severity
  if (memoryPercentage > ALERT_THRESHOLDS.memoryCritical) {
    alerts.push({
      level: 'critical',
      message: 'Critical memory usage detected',
      details: `Memory usage is at ${Math.round(memoryPercentage)}% (threshold: ${ALERT_THRESHOLDS.memoryCritical}%)`,
      timestamp: now,
      type: 'memory',
    });
  } else if (memoryPercentage > ALERT_THRESHOLDS.memoryWarning) {
    alerts.push({
      level: 'warning',
      message: 'High memory usage detected',
      details: `Memory usage is at ${Math.round(memoryPercentage)}% (threshold: ${ALERT_THRESHOLDS.memoryWarning}%)`,
      timestamp: now,
      type: 'memory',
    });
  }

  // Check for high CPU usage (cumulative user+system time as % of wall clock)
  const cpuTotalMs = (cpuUsage.user + cpuUsage.system) / 1000;
  const cpuPercent = uptime > 0 ? (cpuTotalMs / (uptime * 1000)) * 100 : 0;
  if (cpuPercent > ALERT_THRESHOLDS.cpuCritical) {
    alerts.push({
      level: 'critical',
      message: 'Critical CPU usage detected',
      details: `CPU usage is at ${Math.round(cpuPercent)}% (threshold: ${ALERT_THRESHOLDS.cpuCritical}%)`,
      timestamp: now,
      type: 'cpu',
    });
  } else if (cpuPercent > ALERT_THRESHOLDS.cpuWarning) {
    alerts.push({
      level: 'warning',
      message: 'High CPU usage detected',
      details: `CPU usage is at ${Math.round(cpuPercent)}% (threshold: ${ALERT_THRESHOLDS.cpuWarning}%)`,
      timestamp: now,
      type: 'cpu',
    });
  }

  // Check for high error rate
  const recentErrors = ErrorLogger.getInstance().getRecentErrorCount(60000);
  const errorRate = calculateErrorRate(recentErrors, 60);
  if (errorRate > ALERT_THRESHOLDS.errorRateWarning) {
    alerts.push({
      level: errorRate > ALERT_THRESHOLDS.errorRateWarning * 2 ? 'critical' : 'warning',
      message: 'Elevated error rate detected',
      details: `Error rate is ${errorRate.toFixed(2)}/s (threshold: ${ALERT_THRESHOLDS.errorRateWarning}/s)`,
      timestamp: now,
      type: 'error_rate',
    });
  }

  // Check for low uptime (recent restart indicator)
  if (uptime < ALERT_THRESHOLDS.recentRestartSeconds) {
    alerts.push({
      level: 'info',
      message: 'Service recently started',
      details: `Uptime is ${Math.round(uptime)} seconds`,
      timestamp: now,
      type: 'uptime',
    });
  }

  return res.json({
    alerts: alerts,
    count: alerts.length,
    thresholds: ALERT_THRESHOLDS,
    timestamp: now,
  });
});

// Readiness probe
router.get('/ready', (req, res) => {
  // Check if all dependencies are ready
  let dbReady = false;
  try {
    const dbManager = require('../../database/DatabaseManager').DatabaseManager.getInstance();
    dbReady = dbManager.isConnected();
  } catch (error) {
    dbReady = false;
  }

  // We are ready if critical dependencies are up
  const isReady = dbReady;
  const statusCode = isReady ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return ApiResponse.success(res, undefined, statusCode, { ready: isReady, timestamp: new Date().toISOString(), checks: {
        database: dbReady,
        external_apis: true, // Would need actual API checks
        configuration: true,
      } });
});

// Liveness probe
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  return res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

// Prometheus metrics endpoint
router.get('/metrics/prometheus', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memoryUsage.rss}

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1000000}

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1

${MetricsCollector.getInstance().getPrometheusFormat()}
`;

  res.set('Content-Type', 'text/plain; charset=utf-8');
  return res.send(metrics);
});

export const prometheusMetricsHandler = (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const metrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memoryUsage.rss}

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${memoryUsage.heapTotal}

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1000000}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1000000}

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1
`;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
};

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
    return ApiResponse.error(res, 'Endpoint not found', HTTP_STATUS.NOT_FOUND, undefined, { message: `No endpoint found with ID: ${req.params.id}` });
  }

  return res.json({
    endpoint: status,
    timestamp: new Date().toISOString(),
  });
});

// Cleanup endpoint (admin only)
router.post('/cleanup', (req, res) => {
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
      return ApiResponse.error(res, 'Missing required fields', HTTP_STATUS.BAD_REQUEST, undefined, { message: 'id, name, and url are required' });
    }

    // Set defaults
    config.method = config.method || 'GET';
    config.enabled = config.enabled !== false;
    config.interval = config.interval || 60000; // 1 minute
    config.timeout = config.timeout || 10000; // 10 seconds
    config.retries = config.retries || 3;
    config.retryDelay = config.retryDelay || 1000; // 1 second

    apiMonitor.addEndpoint(config);

    return ApiResponse.success(res, undefined, HTTP_STATUS.CREATED, { message: 'Endpoint added successfully', endpoint: apiMonitor.getEndpoint(config.id), timestamp: new Date().toISOString() });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to add endpoint', HTTP_STATUS.BAD_REQUEST, undefined, { message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() });
  }
});

// Add new endpoint to monitor
router.post('/api-endpoints', (req, res) => {
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
      return ApiResponse.error(res, 'Missing required fields', HTTP_STATUS.BAD_REQUEST, undefined, { message: 'id, name, and url are required' });
    }

    // Set defaults
    config.method = config.method || 'GET';
    config.enabled = config.enabled !== false;
    config.interval = config.interval || 60000; // 1 minute
    config.timeout = config.timeout || 10000; // 10 seconds
    config.retries = config.retries || 3;
    config.retryDelay = config.retryDelay || 1000; // 1 second

    apiMonitor.addEndpoint(config);

    return ApiResponse.success(res, undefined, HTTP_STATUS.CREATED, { message: 'Endpoint added successfully', endpoint: apiMonitor.getEndpoint(config.id), timestamp: new Date().toISOString() });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to add endpoint', HTTP_STATUS.BAD_REQUEST, undefined, { message: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() });
  }
});

// Update endpoint configuration
router.put('/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    apiMonitor.updateEndpoint(req.params.id, req.body);

    return res.json({
      message: 'Endpoint updated successfully',
      endpoint: apiMonitor.getEndpoint(req.params.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to update endpoint', HTTP_STATUS.NOT_FOUND, undefined, { message: error instanceof Error ? error.message : 'Endpoint not found', timestamp: new Date().toISOString() });
  }
});

// Remove endpoint from monitoring
router.delete('/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    const endpoint = apiMonitor.getEndpoint(req.params.id);
    if (!endpoint) {
      return ApiResponse.error(res, 'Failed to remove endpoint', HTTP_STATUS.NOT_FOUND, undefined, { message: 'Endpoint not found', timestamp: new Date().toISOString() });
    }
    apiMonitor.removeEndpoint(req.params.id);

    return res.json({
      message: 'Endpoint removed successfully',
      removedEndpoint: endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to remove endpoint', HTTP_STATUS.NOT_FOUND, undefined, { message: error instanceof Error ? error.message : 'Endpoint not found', timestamp: new Date().toISOString() });
  }
});

// Start monitoring all endpoints
router.post('/api-endpoints/start', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  apiMonitor.startAllMonitoring();

  return res.json({
    message: 'Started monitoring all endpoints',
    timestamp: new Date().toISOString(),
  });
});

// Stop monitoring all endpoints
router.post('/api-endpoints/stop', (req, res) => {
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
      return ApiResponse.error(res, 'Failed to update endpoint', HTTP_STATUS.NOT_FOUND, undefined, { message: 'Endpoint not found or payload invalid', timestamp: new Date().toISOString() });
    }

    return ApiResponse.error(res, 'Invalid JSON payload', HTTP_STATUS.BAD_REQUEST, undefined, { message: 'Request body could not be parsed', timestamp: new Date().toISOString() });
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

// Helper functions for health calculations
function calculateHealthStatus(
  memoryUsage: NodeJS.MemoryUsage,
  recentErrors: number,
  metrics: any
) {
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const errorRate = calculateErrorRate(recentErrors, 60);

  let status = 'healthy';
  let errorHealth = 'good';

  // Check memory usage
  if (memoryUsagePercent > 90) {
    status = 'unhealthy';
  } else if (memoryUsagePercent > 80) {
    status = 'degraded';
  }

  // Check error rate
  if (errorRate > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    status = 'unhealthy';
    errorHealth = 'critical';
  } else if (errorRate > HEALTH_THRESHOLDS.ERROR_RATE_DEGRADED) {
    status = status === 'healthy' ? 'degraded' : status;
    errorHealth = 'poor';
  } else if (errorRate > HEALTH_THRESHOLDS.ERROR_RATE_WARNING) {
    errorHealth = 'fair';
  }

  // Check uptime
  if (metrics.uptime < 60000) {
    // Less than 1 minute
    status = status === 'healthy' ? 'degraded' : status;
  }

  return { status, errorHealth };
}

function calculateErrorRate(errorCount: number, timeWindowSeconds: number): number {
  return Math.round((errorCount / timeWindowSeconds) * 100) / 100; // errors per second
}

function getErrorHealthStatus(recentErrors: number): 'good' | 'fair' | 'poor' | 'critical' {
  if (recentErrors === 0) {
    return 'good';
  }
  if (recentErrors <= 2) {
    return 'fair';
  }
  if (recentErrors <= 5) {
    return 'poor';
  }
  return 'critical';
}

function getErrorRecommendations(
  errorStats: Record<string, number>,
  recentErrors: number
): string[] {
  const recommendations: string[] = [];

  if (recentErrors > HEALTH_THRESHOLDS.ERROR_RATE_DEGRADED) {
    recommendations.push(
      'High error rate detected. Check system logs and consider scaling resources.'
    );
  }

  const networkErrors = errorStats['network'] || 0;
  if (networkErrors > 0) {
    recommendations.push('Network errors detected. Check external service connectivity.');
  }

  const dbErrors = errorStats['database'] || 0;
  if (dbErrors > 0) {
    recommendations.push('Database errors detected. Verify database connection and performance.');
  }

  const authErrors = (errorStats['authentication'] || 0) + (errorStats['authorization'] || 0);
  if (authErrors > 2) {
    recommendations.push(
      'Authentication/authorization errors detected. Check user credentials and permissions.'
    );
  }

  return recommendations;
}

function getRecoveryHealthStatus(
  recoveryStats: Record<string, any>
): 'healthy' | 'degraded' | 'unhealthy' {
  const circuitBreakers = Object.values(recoveryStats);
  const openCircuitBreakers = circuitBreakers.filter(
    (cb) => cb.circuitBreaker.state === 'open'
  ).length;

  if (openCircuitBreakers > 0) {
    return 'unhealthy';
  }
  if (
    circuitBreakers.some(
      (cb) => cb.circuitBreaker.failureCount > HEALTH_THRESHOLDS.HIGH_FAILURE_COUNT
    )
  ) {
    return 'degraded';
  }
  return 'healthy';
}

function getRecoveryRecommendations(recoveryStats: Record<string, any>): string[] {
  const recommendations: string[] = [];
  const circuitBreakers = Object.values(recoveryStats);

  const openCircuitBreakers = circuitBreakers.filter((cb) => cb.circuitBreaker.state === 'open');
  if (openCircuitBreakers.length > 0) {
    recommendations.push(
      `${openCircuitBreakers.length} circuit breaker(s) are open. Check underlying services.`
    );
  }

  const highFailureCircuits = circuitBreakers.filter(
    (cb) => cb.circuitBreaker.failureCount > HEALTH_THRESHOLDS.HIGH_FAILURE_COUNT
  );
  if (highFailureCircuits.length > 0) {
    recommendations.push(
      `${highFailureCircuits.length} circuit breaker(s) have high failure rates.`
    );
  }

  const operationsWithoutFallbacks = Object.entries(recoveryStats).filter(
    ([, stats]) => stats.fallbacks === 0
  ).length;

  if (operationsWithoutFallbacks > 0) {
    recommendations.push(`${operationsWithoutFallbacks} operation(s) lack fallback mechanisms.`);
  }

  return recommendations;
}

function detectErrorSpikes(
  errorStats: Record<string, number>
): { type: string; count: number; severity: 'low' | 'medium' | 'high' }[] {
  const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
  const threshold = totalErrors * 0.3; // 30% threshold for spikes

  return Object.entries(errorStats)
    .filter(([, count]) => count > threshold)
    .map(([type, count]) => ({
      type,
      count,
      severity: count > threshold * 2 ? 'high' : count > threshold ? 'medium' : 'low',
    }));
}

function detectErrorCorrelations(
  errorStats: Record<string, number>
): { pattern: string; description: string }[] {
  const correlations: { pattern: string; description: string }[] = [];

  // Check for network + timeout correlation
  if ((errorStats['network'] || 0) > 0 && (errorStats['timeout'] || 0) > 0) {
    correlations.push({
      pattern: 'network_timeout',
      description: 'Network and timeout errors occurring together',
    });
  }

  // Check for auth + authorization correlation
  if ((errorStats['authentication'] || 0) > 0 && (errorStats['authorization'] || 0) > 0) {
    correlations.push({
      pattern: 'auth_chain',
      description: 'Authentication and authorization errors occurring together',
    });
  }

  return correlations;
}

function detectErrorAnomalies(
  recentErrors: number,
  errorStats: Record<string, number>
): { type: string; anomaly: string }[] {
  const anomalies: { type: string; anomaly: string }[] = [];

  // Check for unusual error types
  const totalErrors = Object.values(errorStats).reduce((a, b) => a + b, 0);
  if (totalErrors > 0) {
    Object.entries(errorStats).forEach(([type, count]) => {
      const percentage = (count / totalErrors) * 100;
      if (percentage > HEALTH_THRESHOLDS.DOMINANT_ERROR_PERCENTAGE && type !== 'unknown') {
        anomalies.push({
          type,
          anomaly: `Dominant error type (${percentage.toFixed(1)}% of all errors)`,
        });
      }
    });
  }

  // Check for sudden error bursts
  if (recentErrors > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    anomalies.push({
      type: 'burst',
      anomaly: `High error frequency: ${recentErrors} errors in last minute`,
    });
  }

  return anomalies;
}

function generatePatternRecommendations(
  errorStats: Record<string, number>,
  recentErrors: number
): string[] {
  const recommendations: string[] = [];

  if (recentErrors > HEALTH_THRESHOLDS.RECENT_ERRORS_WARNING) {
    recommendations.push(
      'Implement rate limiting and circuit breakers to prevent cascading failures.'
    );
  }

  const validationErrors = errorStats['validation'] || 0;
  if (validationErrors > HEALTH_THRESHOLDS.VALIDATION_ERRORS_WARNING) {
    recommendations.push(
      'Review input validation logic and provide better error messages to users.'
    );
  }

  const configErrors = errorStats['configuration'] || 0;
  if (configErrors > 0) {
    recommendations.push('Review configuration management and implement configuration validation.');
  }

  return recommendations;
}

export default router;
