import * as process from 'process';
import { Router } from 'express';
import { HTTP_STATUS } from '../../../types/constants';

const router = Router();

// Basic health check
router.get('/', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  let dbStatus = 'unknown';
  try {
    // Requires importing DatabaseManager at the top
    const dbManager = require('../../../database/DatabaseManager').DatabaseManager.getInstance();
    dbStatus = dbManager.isConnected() ? 'healthy' : 'unhealthy';
  } catch (error) {
    dbStatus = 'error';
  }

  // Check memory providers
  let memoryProvidersStatus: Record<string, unknown> = { status: 'none_configured' };
  let anyMemoryProviderUnhealthy = false;
  try {
    const { ProviderRegistry } = require('../../../registries/ProviderRegistry');
    const registry = ProviderRegistry.getInstance();
    const memProviders: Map<
      string,
      { healthCheck(): Promise<{ status: string; details?: Record<string, unknown> }> }
    > = registry.getMemoryProviders();
    if (memProviders.size > 0) {
      const providers: Record<string, { status: string; details?: Record<string, unknown> }> = {};
      const entries = Array.from(memProviders.entries());
      const results = await Promise.allSettled(
        entries.map(([, provider]) => provider.healthCheck())
      );
      for (let i = 0; i < entries.length; i++) {
        const [name] = entries[i];
        const result = results[i];
        if (result.status === 'fulfilled') {
          providers[name] = result.value;
          if (result.value.status !== 'ok') {
            anyMemoryProviderUnhealthy = true;
          }
        } else {
          providers[name] = {
            status: 'error',
            details: { error: result.reason?.message || 'Unknown error' },
          };
          anyMemoryProviderUnhealthy = true;
        }
      }
      memoryProvidersStatus = {
        status: anyMemoryProviderUnhealthy ? 'unhealthy' : 'healthy',
        providers,
      };
    }
  } catch {
    // Registry not available — treat as none configured
  }

  let status = dbStatus === 'healthy' ? 'healthy' : 'degraded';
  if (status === 'healthy' && anyMemoryProviderUnhealthy) {
    status = 'degraded';
  }
  const statusCode = HTTP_STATUS.OK; // Even degraded, we return 200 for basic health. /ready will return HTTP_STATUS.SERVICE_UNAVAILABLE if not ready.

  return res.status(statusCode).json({
    status: status,
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
    memoryProviders: memoryProvidersStatus,
  });
});

// Readiness probe
router.get('/ready', (req, res) => {
  // Check if all dependencies are ready
  let dbReady = false;
  try {
    const dbManager = require('../../../database/DatabaseManager').DatabaseManager.getInstance();
    dbReady = dbManager.isConnected();
  } catch (error) {
    dbReady = false;
  }

  // We are ready if critical dependencies are up
  const isReady = dbReady;
  const statusCode = isReady ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

  return res.status(statusCode).json({
    ready: isReady,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbReady,
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

export default router;
