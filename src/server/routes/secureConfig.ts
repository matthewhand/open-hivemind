
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { SecureConfigManager, type SecureConfig } from '@config/SecureConfigManager';
import { auditMiddleware, logConfigChange, logAdminAction, type AuditedRequest } from '../middleware/audit';

const debug = Debug('app:SecureConfigRoutes');
const router = Router();
const secureConfigManager = SecureConfigManager.getInstance();

router.use(auditMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const configIds = await secureConfigManager.listConfigs();
    const configs = [];

    for (const id of configIds) {
      const config = await secureConfigManager.getConfig(id.id || (id as any));
      if (config) {
        configs.push({
          id: config.id,
          name: config.name,
          updatedAt: config.updatedAt,
        });
      }
    }

    return res.json({ success: true, data: configs, count: configs.length });
  } catch (error: any) {
    debug('Failed to list secure configs:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await secureConfigManager.getConfig(id);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    return res.json({
      success: true,
      data: {
        id: config.id,
        name: config.name,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    debug(`Failed to get secure config ${req.params.id}:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/', async (req: AuditedRequest, res: Response) => {
  try {
    const { id, name, data } = req.body;

    if (!id || !name || !data) {
      return res.status(400).json({ success: false, error: 'Missing required fields: id, name, data' });
    }

    const configToStore: SecureConfig = { id, name, data, updatedAt: new Date().toISOString() } as any;

    await secureConfigManager.storeConfig(configToStore);

    logConfigChange(req, 'CREATE', 'SecureConfig', 'success', `Created secure configuration ${name}`, {
      metadata: { configId: id },
    });

    return res.status(201).json({ success: true, message: 'Configuration stored securely', data: { id, name } });
  } catch (error: any) {
    debug('Failed to store secure config:', error);

    logConfigChange(req, 'CREATE', 'SecureConfig', 'failure', error.message || 'Unknown error', {
      metadata: { error: error.message },
    });

    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.put('/:id', async (req: AuditedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, data } = req.body;

    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, data' });
    }

    const existingConfig = await secureConfigManager.getConfig(id);
    if (!existingConfig) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    const configToStore: SecureConfig = { id, name, data, updatedAt: new Date().toISOString() } as any;

    await secureConfigManager.storeConfig(configToStore);

    logConfigChange(req, 'UPDATE', 'SecureConfig', 'success', `Updated secure configuration ${name}`, {
      metadata: { configId: id },
    });

    return res.json({ success: true, message: 'Configuration updated securely', data: { id, name } });
  } catch (error: any) {
    debug(`Failed to update secure config ${req.params.id}:`, error);

    logConfigChange(req, 'UPDATE', 'SecureConfig', 'failure', error.message || 'Unknown error', {
      metadata: { configId: req.params.id, error: error.message },
    });

    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuditedRequest, res: Response) => {
  try {
    const { id } = req.params;

    try {
        await secureConfigManager.deleteConfig(id);
    } catch(e) {
        return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    logConfigChange(req, 'DELETE', 'SecureConfig', 'success', `Deleted secure configuration ${id}`, {
      metadata: { configId: id },
    });

    return res.json({ success: true, message: 'Configuration deleted successfully' });
  } catch (error: any) {
    debug(`Failed to delete secure config ${req.params.id}:`, error);

    logConfigChange(req, 'DELETE', 'SecureConfig', 'failure', error.message || 'Unknown error', {
      metadata: { configId: req.params.id, error: error.message },
    });

    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/:id/test', async (req: AuditedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const config = await secureConfigManager.getConfig(id);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    logAdminAction(req, 'TEST_CONNECTION', 'SecureConfig', 'success', `Tested connection for ${config.name}`, {
      metadata: { configId: id },
    });

    return res.json({ success: true, message: 'Connection test completed (simulated)', data: { status: 'ok', latency: Math.floor(Math.random() * 100) + 20 } });
  } catch (error: any) {
    debug(`Failed to test secure config ${req.params.id}:`, error);

    logAdminAction(req, 'TEST_CONNECTION', 'SecureConfig', 'failure', error.message || 'Unknown error', {
      metadata: { configId: req.params.id, error: error.message },
    });

    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;
