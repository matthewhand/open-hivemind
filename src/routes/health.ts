import { Router } from 'express';
import ApiMonitorService from '../services/ApiMonitorService';
import os from 'os';
import process from 'process';

const router = Router();

// Basic health check route
router.get('/health', (req, res) => {
  res.status(200).send('OK');
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
    }
  };

  res.json(healthData);
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

export default router;
