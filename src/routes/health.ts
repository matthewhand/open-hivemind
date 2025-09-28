import { Router, Request, Response, NextFunction } from 'express';
import ApiMonitorService from '../services/ApiMonitorService';
import os from 'os';
import process from 'process';

const router = Router();

// Basic health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check with system metrics
router.get('/health/detailed', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100), // %
      percentage: (Math.round(memoryUsage.heapUsed / 1024 / 1024) / Math.round(memoryUsage.heapTotal / 1024 / 1024)) * 100, // % based on rounded values
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
    }
  };

  res.json(healthData);
});

// Performance metrics endpoint
router.get('/health/metrics', (req, res) => {
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
      rate: 0,  // Would need to implement rate calculation
    }
  };

  res.json(metricsData);
});

// System alerts endpoint
router.get('/health/alerts', (req, res) => {
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
      type: 'memory'
    });
  }
  
  // Check for low uptime (less than 30 seconds might indicate recent restart)
  if (uptime < 30) {
    alerts.push({
      level: 'info',
      message: 'Service recently started',
      details: `Uptime is ${Math.round(uptime)} seconds`,
      timestamp: new Date().toISOString(),
      type: 'uptime'
    });
  }

  res.json({
    alerts: alerts,
    count: alerts.length,
    timestamp: new Date().toISOString()
  });
});

// Readiness probe endpoint
router.get('/health/ready', (req, res) => {
  // Check if all dependencies are ready
  // For now, we'll assume the service is ready if it's responding
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
    checks: {
      database: true, // Would need actual database check
      external_apis: true, // Would need actual API checks
      configuration: true
    }
  });
});

// Liveness probe endpoint
router.get('/health/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
router.get('/health/metrics/prometheus', (req, res) => {
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
});

// API endpoints monitoring
router.get('/health/api-endpoints', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  const statuses = apiMonitor.getAllStatuses();
  const overallHealth = apiMonitor.getOverallHealth();

  res.json({
    overall: overallHealth,
    endpoints: statuses,
    timestamp: new Date().toISOString(),
  });
});

// Get specific endpoint status
router.get('/health/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  const status = apiMonitor.getEndpointStatus(req.params.id);

  if (!status) {
    return res.status(404).json({
      error: 'Endpoint not found',
      message: `No endpoint found with ID: ${req.params.id}`
    });
  }

  res.json({
    endpoint: status,
    timestamp: new Date().toISOString(),
  });
});

// Add new endpoint to monitor
router.post('/health/api-endpoints', (req, res) => {
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
        message: 'id, name, and url are required'
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

    res.status(201).json({
      message: 'Endpoint added successfully',
      endpoint: apiMonitor.getEndpoint(config.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to add endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Update endpoint configuration
router.put('/health/api-endpoints/:id', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();

  try {
    apiMonitor.updateEndpoint(req.params.id, req.body);

    res.json({
      message: 'Endpoint updated successfully',
      endpoint: apiMonitor.getEndpoint(req.params.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(404).json({
      error: 'Failed to update endpoint',
      message: error instanceof Error ? error.message : 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
  }
});

// Remove endpoint from monitoring
router.delete('/health/api-endpoints/:id', (req, res) => {
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

    res.json({
      message: 'Endpoint removed successfully',
      removedEndpoint: endpoint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(404).json({
      error: 'Failed to remove endpoint',
      message: error instanceof Error ? error.message : 'Endpoint not found',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start monitoring all endpoints
router.post('/health/api-endpoints/start', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  apiMonitor.startAllMonitoring();

  res.json({
    message: 'Started monitoring all endpoints',
    timestamp: new Date().toISOString(),
  });
});

// Stop monitoring all endpoints
router.post('/health/api-endpoints/stop', (req, res) => {
  const apiMonitor = ApiMonitorService.getInstance();
  apiMonitor.stopAllMonitoring();

  res.json({
    message: 'Stopped monitoring all endpoints',
    timestamp: new Date().toISOString(),
  });
});

router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const isParseError = err instanceof SyntaxError || err?.type === 'entity.parse.failed';
  if (isParseError && req.path?.startsWith('/health/api-endpoints')) {
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

export default router;
