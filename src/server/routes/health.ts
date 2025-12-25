import { Router } from 'express';
import AdvancedMonitor from '../../monitoring/AdvancedMonitor';
import { DiscordService } from '@integrations/discord/DiscordService';
import { SlackService } from '@integrations/slack/SlackService';
import { createErrorResponse } from '../../utils/errorResponse';
import Debug from 'debug';

const debug = Debug('app:healthRoutes');
const router = Router();
const monitor = AdvancedMonitor.getInstance();

// Start monitoring when the module is loaded
monitor.startMonitoring();

// Basic health check
router.get('/health', (req, res) => {
  try {
    const healthStatus = monitor.getHealthStatus();

    // Get Discord and Slack service health
    let discordHealth = null;
    let slackHealth = null;
    
    try {
      const discordService = DiscordService.getInstance();
      discordHealth = discordService.getHealthStatus();
    } catch (e) {
      debug('Could not get Discord health status:', e);
    }
    
    try {
      const slackService = SlackService.getInstance();
      slackHealth = slackService.getMetrics();
    } catch (e) {
      debug('Could not get Slack health status:', e);
    }

    const response = {
      status: healthStatus.overall === 'healthy' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        discord: discordHealth,
        slack: slackHealth,
        core: healthStatus.services,
      },
    };

    const statusCode = healthStatus.overall === 'healthy' ? 200 :
      healthStatus.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    debug('Health check error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 503).json(errorResponse);
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
        cpu: process.cpuUsage(),
      },
    };

    const statusCode = healthStatus.overall === 'healthy' ? 200 :
      healthStatus.overall === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    debug('Detailed health check error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 503).json(errorResponse);
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
      application: applicationMetrics,
    });
  } catch (error) {
    debug('Metrics endpoint error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 500).json(errorResponse);
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
      active: alerts.filter((a: any) => !a.resolved).length,
    });
  } catch (error) {
    debug('Alerts endpoint error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 500).json(errorResponse);
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
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Alert ${alertId} not found or already resolved`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    debug('Resolve alert endpoint error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 500).json(errorResponse);
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
        message: 'Service is ready to accept requests',
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        message: 'Service is not ready',
        issues: healthStatus.alerts.filter((a: any) => !a.resolved).map((a: any) => a.message),
      });
    }
  } catch (error) {
    debug('Readiness probe error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 503).json(errorResponse);
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
      memory: process.memoryUsage().heapUsed,
    });
  } catch (error) {
    debug('Liveness probe error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 503).json(errorResponse);
  }
});

// Prometheus metrics endpoint
router.get('/health/metrics/prometheus', (req, res) => {
  try {
    const metrics = monitor.getMetricsSummary();
    const systemMetrics = monitor.getSystemMetrics(1)[0];

    let prometheusOutput = '# HELP openhivemind_uptime_seconds Service uptime in seconds\n';
    prometheusOutput += '# TYPE openhivemind_uptime_seconds gauge\n';
    prometheusOutput += `openhivemind_uptime_seconds ${process.uptime()}\n\n`;

    prometheusOutput += '# HELP openhivemind_memory_usage_bytes Memory usage in bytes\n';
    prometheusOutput += '# TYPE openhivemind_memory_usage_bytes gauge\n';
    prometheusOutput += `openhivemind_memory_usage_bytes ${process.memoryUsage().heapUsed}\n\n`;

    if (systemMetrics) {
      prometheusOutput += '# HELP openhivemind_cpu_usage_percent CPU usage percentage\n';
      prometheusOutput += '# TYPE openhivemind_cpu_usage_percent gauge\n';
      prometheusOutput += `openhivemind_cpu_usage_percent ${systemMetrics.cpu.usage}\n\n`;

      prometheusOutput += '# HELP openhivemind_memory_usage_percent Memory usage percentage\n';
      prometheusOutput += '# TYPE openhivemind_memory_usage_percent gauge\n';
      prometheusOutput += `openhivemind_memory_usage_percent ${systemMetrics.memory.usagePercent}\n\n`;
    }

    prometheusOutput += '# HELP openhivemind_active_alerts Number of active alerts\n';
    prometheusOutput += '# TYPE openhivemind_active_alerts gauge\n';
    prometheusOutput += `openhivemind_active_alerts ${metrics.health.alerts.filter((a: any) => !a.resolved).length}\n\n`;

    prometheusOutput += '# HELP openhivemind_health_status Health status (0=healthy, 1=degraded, 2=unhealthy)\n';
    prometheusOutput += '# TYPE openhivemind_health_status gauge\n';
    const healthValue = metrics.health.overall === 'healthy' ? 0 :
      metrics.health.overall === 'degraded' ? 1 : 2;
    prometheusOutput += `openhivemind_health_status ${healthValue}\n`;

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(prometheusOutput);
  } catch (error) {
    debug('Prometheus metrics endpoint error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 500).json(errorResponse);
  }
});

// Cleanup endpoint (admin only)
router.post('/health/cleanup', (req, res) => {
  try {
    monitor.cleanup();
    res.json({
      success: true,
      message: 'Monitoring data cleanup completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    debug('Cleanup endpoint error:', error);
    const errorResponse = createErrorResponse(error as Error, req.path);
    res.status(errorResponse.getStatusCode() || 500).json(errorResponse);
  }
});

export default router;