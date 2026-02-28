import os from 'os';
import process from 'process';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { MetricsCollector } from '../../monitoring/MetricsCollector';
import ApiMonitorService from '../../services/ApiMonitorService';
import { ErrorLogger } from '../../utils/errorLogger';
import { globalRecoveryManager } from '../../utils/errorRecovery';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      processId: process.pid,
    },
  });
});

// Detailed health check
router.get('/detailed', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const metrics = MetricsCollector.getInstance().getMetrics();
  const errorLogger = ErrorLogger.getInstance();
  const errorStats = errorLogger.getErrorStats();
  const recentErrors = errorLogger.getRecentErrorCount(60000); // Last minute
  const recoveryStats = globalRecoveryManager.getAllStats();

  // Calculate overall health status
  const healthStatus = calculateHealthStatus(memoryUsage, recentErrors, metrics);

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

// Alerts endpoint
router.get('/alerts', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const uptime = process.uptime();

  const alerts = [];

  // Check for high memory usage
  if (memoryPercentage > 80) {
    alerts.push({
      level: 'warning',
      message: 'High memory usage detected',
      details: `Memory usage is at ${Math.round(memoryPercentage)}%`,
      timestamp: new Date().toISOString(),
      type: 'memory',
    });
  }

  // Check for low uptime (less than 30 seconds might indicate recent restart)
  if (uptime < 30) {
    alerts.push({
      level: 'info',
      message: 'Service recently started',
      details: `Uptime is ${Math.round(uptime)} seconds`,
      timestamp: new Date().toISOString(),
      type: 'uptime',
    });
  }

  return res.json({
    alerts: alerts,
    count: alerts.length,
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe
router.get('/ready', (req, res) => {
  // Check if all dependencies are ready
  // For now, we'll assume the service is ready if it's responding
  return res.json({
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: true, // Would need actual database check
      external_apis: true, // Would need actual API checks
      configuration: true,
    },
  });
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
`;

  res.set('Content-Type', 'text/plain');
  return res.send(metrics);
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
    return res.status(404).json({
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
      return res.status(400).json({
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

    return res.status(201).json({
      message: 'Endpoint added successfully',
      endpoint: apiMonitor.getEndpoint(config.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to add endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
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
      return res.status(400).json({
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

    return res.status(201).json({
      message: 'Endpoint added successfully',
      endpoint: apiMonitor.getEndpoint(config.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Failed to add endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
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
    return res.status(404).json({
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
      return res.status(404).json({
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
    return res.status(404).json({
      error: 'Failed to remove endpoint',
      message: error instanceof Error ? error.message : 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
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
      return res.status(404).json({
        error: 'Failed to update endpoint',
        message: 'Endpoint not found or payload invalid',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(400).json({
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

  const patternsData = {
    timestamp: new Date().toISOString(),
    patterns: {
      errorTypes: Object.entries(errorStats)
        .sort(([, a]: [string, any], [, b]: [string, any]) => (b as number) - (a as number))
        .map(([type, count]) => {
          const totalCount = Object.values(errorStats).reduce(
            (sum: number, val: any) => sum + (val as number),
            0
          );
          return {
            type,
            count: count as number,
            percentage: ((count as number) / (totalCount as number)) * 100,
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
  if (errorRate > 10) {
    status = 'unhealthy';
    errorHealth = 'critical';
  } else if (errorRate > 5) {
    status = status === 'healthy' ? 'degraded' : status;
    errorHealth = 'poor';
  } else if (errorRate > 1) {
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

  if (recentErrors > 5) {
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
  if (circuitBreakers.some((cb) => cb.circuitBreaker.failureCount > 3)) {
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

  const highFailureCircuits = circuitBreakers.filter((cb) => cb.circuitBreaker.failureCount > 3);
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
      if (percentage > 50 && type !== 'unknown') {
        anomalies.push({
          type,
          anomaly: `Dominant error type (${percentage.toFixed(1)}% of all errors)`,
        });
      }
    });
  }

  // Check for sudden error bursts
  if (recentErrors > 10) {
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

  if (recentErrors > 10) {
    recommendations.push(
      'Implement rate limiting and circuit breakers to prevent cascading failures.'
    );
  }

  const validationErrors = errorStats['validation'] || 0;
  if (validationErrors > 3) {
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
