import { Router, Request, Response } from 'express';
import { SecureConfigManager, SecureConfig } from '@config/SecureConfigManager';
import Debug from 'debug';

const debug = Debug('app:SecureConfigRoutes');
const router = Router();
const secureConfigManager = SecureConfigManager.getInstance();

/**
 * GET /webui/api/secure-config
 * List all secure configurations (without sensitive data)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const configIds = await secureConfigManager.listConfigs();
    const configs = [];

    for (const id of configIds) {
      const config = await secureConfigManager.getConfig(id);
      if (config) {
        // Return metadata without sensitive data
        configs.push({
          id: config.id,
          name: config.name,
          type: config.type,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        });
      }
    }

    res.json({
      success: true,
      data: configs,
      count: configs.length
    });
  } catch (error: any) {
    debug('Failed to list secure configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configurations'
    });
  }
});

/**
 * GET /webui/api/secure-config/:id
 * Get a specific secure configuration
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await secureConfigManager.getConfig(id);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    debug(`Failed to get secure config ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration'
    });
  }
});

/**
 * POST /webui/api/secure-config
 * Create a new secure configuration
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, name, type, data } = req.body;

    if (!id || !name || !type || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, type, data'
      });
    }

    const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id,
      name,
      type,
      data,
      createdAt: new Date().toISOString()
    };

    await secureConfigManager.storeConfig(config);

    res.status(201).json({
      success: true,
      message: 'Configuration stored securely',
      data: { id, name, type }
    });
  } catch (error: any) {
    debug('Failed to create secure config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store configuration'
    });
  }
});

/**
 * PUT /webui/api/secure-config/:id
 * Update an existing secure configuration
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, data } = req.body;

    if (!name || !type || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, data'
      });
    }

    // Check if config exists
    const existingConfig = await secureConfigManager.getConfig(id);
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    const updatedConfig: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id,
      name,
      type,
      data,
      createdAt: existingConfig.createdAt
    };

    await secureConfigManager.storeConfig(updatedConfig);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: { id, name, type }
    });
  } catch (error: any) {
    debug(`Failed to update secure config ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * DELETE /webui/api/secure-config/:id
 * Delete a secure configuration
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await secureConfigManager.deleteConfig(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error: any) {
    debug(`Failed to delete secure config ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete configuration'
    });
  }
});

/**
 * POST /webui/api/secure-config/backup
 * Create a backup of all secure configurations
 */
router.post('/backup', async (req: Request, res: Response) => {
  try {
    const backupId = await secureConfigManager.createBackup();

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: { backupId }
    });
  } catch (error: any) {
    debug('Failed to create backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

/**
 * GET /webui/api/secure-config/backups
 * List all available backups
 */
router.get('/backups/list', async (req: Request, res: Response) => {
  try {
    const backups = await secureConfigManager.listBackups();

    res.json({
      success: true,
      data: backups,
      count: backups.length
    });
  } catch (error: any) {
    debug('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve backups'
    });
  }
});

/**
 * POST /webui/api/secure-config/restore/:backupId
 * Restore from a specific backup
 */
router.post('/restore/:backupId', async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    await secureConfigManager.restoreBackup(backupId);

    res.json({
      success: true,
      message: `Successfully restored from backup ${backupId}`
    });
  } catch (error: any) {
    debug(`Failed to restore backup ${req.params.backupId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore from backup'
    });
  }
});

export default router;