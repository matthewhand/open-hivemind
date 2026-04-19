import process from 'process';
import { Router } from 'express';
import { UserConfigStore } from '../../../config/UserConfigStore';
import { HTTP_STATUS } from '../../../types/constants';

const router = Router();

/**
 * Helper to get memory provider status
 */
async function getMemoryProviderStatus() {
  try {
    const { ProviderRegistry } = require('../../../registries/ProviderRegistry');
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getMemoryProviders();
    
    if (providers.size === 0) {
      return { status: 'none_configured' };
    }

    const statusMap: Record<string, any> = {};
    let allOk = true;

    for (const [name, provider] of providers.entries()) {
      try {
        const check = await provider.healthCheck();
        statusMap[name] = check;
        if (check.status !== 'ok') allOk = false;
      } catch (err) {
        statusMap[name] = { status: 'error', details: { error: err instanceof Error ? err.message : String(err) } };
        allOk = false;
      }
    }

    return {
      status: allOk ? 'healthy' : 'unhealthy',
      providers: statusMap
    };
  } catch {
    return undefined;
  }
}

// GET /health - basic health check (live/ready probe)
router.get('/', async (req, res) => {
  const dbManager = require('../../../database/DatabaseManager').DatabaseManager.getInstance();
  const isDbConnected = dbManager.isConnected();
  const isMaintenanceMode = UserConfigStore.getInstance().isMaintenanceMode();
  
  const memoryStatus = await getMemoryProviderStatus();

  let status = !isDbConnected ? 'down' : isMaintenanceMode ? 'degraded' : 'healthy';
  if (status === 'healthy' && memoryStatus?.status === 'unhealthy') {
    status = 'degraded';
  }

  return res.status(HTTP_STATUS.OK).json({
    status,
    ready: isDbConnected,
    maintenanceMode: isMaintenanceMode,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryProviders: memoryStatus,
    checks: {
      database: isDbConnected,
      external_apis: true, // Placeholder
      configuration: true,
    }
  });
});

// GET /health/ready - Readiness probe for Kubernetes/orchestrators
router.get('/ready', (req, res) => {
  const dbManager = require('../../../database/DatabaseManager').DatabaseManager.getInstance();
  const isConnected = dbManager.isConnected();

  if (isConnected) {
    return res.status(HTTP_STATUS.OK).json({ 
      status: 'ready', 
      ready: true,
      checks: {
        database: true,
        external_apis: true,
        configuration: true,
      },
      timestamp: new Date().toISOString()
    });
  }

  return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
    status: 'not ready',
    ready: false,
    reason: 'Database not connected',
    checks: {
      database: false,
    }
  });
});

// GET /health/live - Liveness probe for Kubernetes/orchestrators
router.get('/live', (req, res) => {
  return res.status(HTTP_STATUS.OK).json({ status: 'live', alive: true });
});

// GET /health/maintenance - Public maintenance status
router.get('/maintenance', (req, res) => {
  const isMaintenanceMode = UserConfigStore.getInstance().isMaintenanceMode();

  return res.json({
    maintenanceMode: isMaintenanceMode,
    timestamp: new Date().toISOString(),
    message: isMaintenanceMode
      ? 'System is currently in maintenance mode'
      : 'System is operating normally',
  });
});

export default router;
