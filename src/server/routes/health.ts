import { Router, Request, Response } from 'express';
import AdvancedMonitor from '../../monitoring/AdvancedMonitor';
import { MetricsCollector } from '../../monitoring/MetricsCollector';
import { DatabaseManager } from '../../database/DatabaseManager';
import Debug from 'debug';

const debug = Debug('app:healthRoutes');
const router = Router();
const monitor = AdvancedMonitor.getInstance();
const metricsCollector = MetricsCollector.getInstance();

// Start monitoring when the module is loaded
monitor.startMonitoring();

// Basic health check
router.get('/health', (req, res) => {
  try {
    const healthStatus = monitor.getHealthStatus();

    const response = {
      status: healthStatus.overall === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const statusCode = healthStatus.overall === 'healthy' ? 200 :
                      healthStatus.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    debug('Health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check
router.get('/health/detailed', (req, res) => {
  try {
    const healthStatus = monitor.getHealthStatus();
    const metrics = monitor.getMetricsSummary();

    const response = {
      status: healthStatus.overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: healthStatus.services,
      alerts: healthStatus.alerts,
      metrics: metrics,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    const statusCode = healthStatus.overall === 'healthy' ? 200 :
                      healthStatus.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    debug('Detailed health check error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

// System metrics endpoint
router.get('/health/metrics', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const systemMetrics = monitor.getSystemMetrics(limit);
    const applicationMetrics = monitor.getApplicationMetrics(limit);

    res.json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      application: applicationMetrics
    });
  } catch (error) {
    debug('Metrics endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Alerts endpoint
router.get('/health/alerts', (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const alerts = monitor.getAlerts(activeOnly);

    res.json({
      timestamp: new Date().toISOString(),
      alerts: alerts,
      total: alerts.length,
      active: alerts.filter((a: any) => !a.resolved).length
    });
  } catch (error) {
    debug('Alerts endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      timestamp: new Date().toISOString()
    });
  }
});

// Anomalies endpoint
router.get('/health/anomalies', async (req: Request, res: Response) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    const activeOnly = req.query.active !== 'false';
    let anomalies;

    if (activeOnly) {
      anomalies = await dbManager.getActiveAnomalies();
    } else {
      anomalies = await dbManager.getAnomalies();
    }

    res.json({
      timestamp: new Date().toISOString(),
      anomalies,
      total: anomalies.length,
      active: anomalies.filter((a: any) => !a.resolved).length
    });
  } catch (error) {
    debug('Anomalies endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve anomalies',
      timestamp: new Date().toISOString()
    });
  }
});

// Resolve anomaly endpoint
router.post('/health/anomalies/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dbManager = DatabaseManager.getInstance();
    const resolved = await dbManager.resolveAnomaly(id);

    if (resolved) {
      res.json({
        success: true,
        message: `Anomaly ${id} resolved`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Anomaly ${id} not found or already resolved`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    debug('Resolve anomaly endpoint error:', error);
    res.status(500).json({
      error: 'Failed to resolve anomaly',
      timestamp: new Date().toISOString()
    });
  }
});

// Resolve alert endpoint
router.post('/health/alerts/:alertId/resolve', (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = monitor.resolveAlert(alertId);

    if (resolved) {
      res.json({
        success: true,
        message: `Alert ${alertId} resolved`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Alert ${alertId} not found or already resolved`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    debug('Resolve alert endpoint error:', error);
    res.status(500).json({
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness probe
router.get('/health/ready', (req, res) => {
  try {
    // Check if core services are ready
    const healthStatus = monitor.getHealthStatus();

    // Consider the service ready if it's not unhealthy
    const isReady = healthStatus.overall !== 'unhealthy';

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Service is ready to accept requests'
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        message: 'Service is not ready',
        issues: healthStatus.alerts.filter((a: any) => !a.resolved).map((a: any) => a.message)
      });
    }
  } catch (error) {
    debug('Readiness probe error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Readiness check failed'
    });
  }
});

// Liveness probe
router.get('/health/live', (req, res) => {
  try {
    // Basic liveness check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed
    });
  } catch (error) {
    debug('Liveness probe error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Liveness check failed'
    });
  }
});

// Prometheus metrics endpoint
router.get('/health/metrics/prometheus', async (req, res) => {
  try {
    const prometheusMetrics = await metricsCollector.getPrometheusFormat();

    // Add custom health metrics if not covered by prom-client defaults
    const metrics = monitor.getMetricsSummary();
    let additionalMetrics = '';

    additionalMetrics += `# HELP openhivemind_active_alerts Number of active alerts\n`;
    additionalMetrics += `# TYPE openhivemind_active_alerts gauge\n`;
    additionalMetrics += `openhivemind_active_alerts ${metrics.health.alerts.filter((a: any) => !a.resolved).length}\n\n`;

    additionalMetrics += `# HELP openhivemind_health_status Health status (0=healthy, 1=degraded, 2=unhealthy)\n`;
    additionalMetrics += `# TYPE openhivemind_health_status gauge\n`;
    const healthValue = metrics.health.overall === 'healthy' ? 0 :
                       metrics.health.overall === 'degraded' ? 1 : 2;
    additionalMetrics += `openhivemind_health_status ${healthValue}\n\n`;

    const fullMetrics = prometheusMetrics + additionalMetrics;

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(fullMetrics);
  } catch (error) {
    debug('Prometheus metrics endpoint error:', error);
    res.status(500).send('# Error generating Prometheus metrics\n');
  }
});

// Cleanup endpoint (admin only)
router.post('/health/cleanup', (req, res) => {
  try {
    monitor.cleanup();
    res.json({
      success: true,
      message: 'Monitoring data cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    debug('Cleanup endpoint error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;