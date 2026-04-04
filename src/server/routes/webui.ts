import os from 'os';
import process from 'process';
import { Router } from 'express';
import { MetricsCollector } from '../../monitoring/MetricsCollector';
import { providerRegistry } from '../../registries/ProviderRegistry';

const router = Router();

// GET /system-status - Overall system status for the WebUI
router.get('/system-status', (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime,
    version: '1.0.0',
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
    },
  });
});

// GET /providers - List registered providers
router.get('/providers', (_req, res) => {
  try {
    const providers = providerRegistry.getAll().map((p) => ({
      id: p.id,
      label: p.label,
      type: p.type,
    }));
    return res.json({ providers, timestamp: new Date().toISOString() });
  } catch {
    return res.json({ providers: [], timestamp: new Date().toISOString() });
  }
});

// GET /env-status - Environment variable status (safe summary, no values)
router.get('/env-status', (_req, res) => {
  const envKeys = [
    'NODE_ENV',
    'PORT',
    'HTTP_ENABLED',
    'SKIP_MESSENGERS',
    'MESSAGE_PROVIDER',
    'LLM_PROVIDER',
    'ENABLE_WELCOME_MESSAGE',
    'WEBHOOK_ENABLED',
    'ADMIN_PASSWORD',
  ];

  const status = envKeys.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = process.env[key] !== undefined;
    return acc;
  }, {});

  return res.json({
    env: status,
    nodeEnv: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
});

// GET /validate-config - Basic configuration validation
router.get('/validate-config', (_req, res) => {
  const issues: string[] = [];

  if (!process.env.NODE_ENV) {
    issues.push('NODE_ENV is not set');
  }
  if (!process.env.PORT) {
    issues.push('PORT is not set (using default 3028)');
  }

  return res.json({
    valid: issues.length === 0,
    issues,
    timestamp: new Date().toISOString(),
  });
});

// GET /health - Simple health check for the WebUI layer
router.get('/health', (_req, res) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /metrics - Metrics snapshot for WebUI dashboards
router.get('/metrics', (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const metrics = MetricsCollector.getInstance().getMetrics();

  return res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
    },
    messages: {
      processed: metrics.messagesProcessed,
      errors: metrics.errors,
    },
  });
});

export default router;
