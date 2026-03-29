import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { SecureConfigManager, type SecureConfig } from '@config/SecureConfigManager';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../middleware/audit';
import { ApiResponse } from "../utils/ApiResponse";

const debug = Debug('app:SecureConfigRoutes');
const router = Router();
const secureConfigManager = SecureConfigManager.getInstance();

// Apply audit middleware to all secure config routes
router.use(auditMiddleware);

/**
 * GET /webui/api/secure-config
 * List all secure configurations (without sensitive data)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const configIds = await secureConfigManager.listConfigs();
    const configs = [];

    const configPromises = configIds.map((configData) =>
      secureConfigManager.getConfig(configData.id)
    );
    const configResults = await Promise.all(configPromises);

    for (const config of configResults) {
      if (config) {
        // Return metadata without sensitive data
        configs.push({
          id: config.id,
          name: config.name,
          type: config.type,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        });
      }
    }

    return res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error: any) {
    debug('Failed to list secure configs:', error);
    return ApiResponse.error(res, 'Failed to retrieve configurations', 500);
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
      return ApiResponse.error(res, 'Configuration not found', 404);
    }

    return res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    debug(`Failed to get secure config ${req.params.id}:`, error);
    return ApiResponse.error(res, 'Failed to retrieve configuration', 500);
  }
});

/**
 * POST /webui/api/secure-config
 * Create a new secure configuration
 */
router.post('/', async (req: AuditedRequest, res: Response) => {
  try {
    const { id, name, type, data } = req.body;

    if (!id || !name || !type || !data) {
      logConfigChange(
        req,
        'CREATE',
        `secure-config/${id}`,
        'failure',
        'Missing required fields: id, name, type, data'
      );
      return ApiResponse.error(res, 'Missing required fields: id, name, type, data', 400);
    }

    const config: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id,
      name,
      type,
      data,
      createdAt: new Date().toISOString(),
    };

    await secureConfigManager.storeConfig(config);

    logConfigChange(
      req,
      'CREATE',
      `secure-config/${id}`,
      'success',
      `Created secure configuration ${name} of type ${type}`
    );

    return ApiResponse.success(res, { id, name, type }, 201, { message: 'Configuration stored securely' });
  } catch (error: any) {
    debug('Failed to create secure config:', error);
    logConfigChange(
      req,
      'CREATE',
      `secure-config/${req.body?.id || 'unknown'}`,
      'failure',
      `Failed to create secure configuration: ${error.message}`
    );
    return ApiResponse.error(res, 'Failed to store configuration', 500);
  }
});

/**
 * PUT /webui/api/secure-config/:id
 * Update an existing secure configuration
 */
router.put('/:id', async (req: AuditedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, data } = req.body;

    if (!name || !type || !data) {
      logConfigChange(
        req,
        'UPDATE',
        `secure-config/${id}`,
        'failure',
        'Missing required fields: name, type, data'
      );
      return ApiResponse.error(res, 'Missing required fields: name, type, data', 400);
    }

    // Check if config exists
    const existingConfig = await secureConfigManager.getConfig(id);
    if (!existingConfig) {
      logConfigChange(req, 'UPDATE', `secure-config/${id}`, 'failure', 'Configuration not found');
      return ApiResponse.error(res, 'Configuration not found', 404);
    }

    const updatedConfig: Omit<SecureConfig, 'updatedAt' | 'checksum'> = {
      id,
      name,
      type,
      data,
      createdAt: existingConfig.createdAt,
    };

    await secureConfigManager.storeConfig(updatedConfig);

    logConfigChange(
      req,
      'UPDATE',
      `secure-config/${id}`,
      'success',
      `Updated secure configuration ${name}`,
      {
        oldValue: existingConfig,
        newValue: updatedConfig,
      }
    );

    return res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: { id, name, type },
    });
  } catch (error: any) {
    debug(`Failed to update secure config ${req.params.id}:`, error);
    logConfigChange(
      req,
      'UPDATE',
      `secure-config/${req.params.id}`,
      'failure',
      `Failed to update secure configuration: ${error.message}`
    );
    return ApiResponse.error(res, 'Failed to update configuration', 500);
  }
});

/**
 * DELETE /webui/api/secure-config/:id
 * Delete a secure configuration
 */
router.delete('/:id', async (req: AuditedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get config before deletion for audit logging
    const configToDelete = await secureConfigManager.getConfig(id);

    try {
      await secureConfigManager.deleteConfig(id);
    } catch {
      logConfigChange(req, 'DELETE', `secure-config/${id}`, 'failure', 'Configuration not found');
      return ApiResponse.error(res, 'Configuration not found', 404);
    }

    logConfigChange(
      req,
      'DELETE',
      `secure-config/${id}`,
      'success',
      `Deleted secure configuration ${configToDelete?.name || id}`,
      {
        oldValue: configToDelete,
      }
    );

    return res.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error: any) {
    debug(`Failed to delete secure config ${req.params.id}:`, error);
    logConfigChange(
      req,
      'DELETE',
      `secure-config/${req.params.id}`,
      'failure',
      `Failed to delete secure configuration: ${error.message}`
    );
    return ApiResponse.error(res, 'Failed to delete configuration', 500);
  }
});

/**
 * POST /webui/api/secure-config/backup
 * Create a backup of all secure configurations
 */
router.post('/backup', async (req: AuditedRequest, res: Response) => {
  try {
    const backupId = await secureConfigManager.createBackup();

    logConfigChange(
      req,
      'CREATE',
      `secure-config/backup/${backupId}`,
      'success',
      'Created backup of all secure configurations'
    );

    return res.json({
      success: true,
      message: 'Backup created successfully',
      data: { backupId },
    });
  } catch (error: any) {
    debug('Failed to create backup:', error);
    logConfigChange(
      req,
      'CREATE',
      'secure-config/backup',
      'failure',
      `Failed to create backup: ${error.message}`
    );
    return ApiResponse.error(res, 'Failed to create backup', 500);
  }
});

/**
 * GET /webui/api/secure-config/backups
 * List all available backups
 */
router.get('/backups/list', async (req: Request, res: Response) => {
  try {
    const backups = await secureConfigManager.listBackups();

    return res.json({
      success: true,
      data: backups,
      count: backups.length,
    });
  } catch (error: any) {
    debug('Failed to list backups:', error);
    return ApiResponse.error(res, 'Failed to retrieve backups', 500);
  }
});

/**
 * POST /webui/api/secure-config/restore/:backupId
 * Restore from a specific backup
 */
router.post('/restore/:backupId', async (req: AuditedRequest, res: Response) => {
  try {
    const { backupId } = req.params;
    await secureConfigManager.restoreBackup(backupId);

    logConfigChange(
      req,
      'UPDATE',
      'secure-config/global',
      'success',
      `Restored secure configurations from backup ${backupId}`
    );

    return res.json({
      success: true,
      message: `Successfully restored from backup ${backupId}`,
    });
  } catch (error: any) {
    debug(`Failed to restore backup ${req.params.backupId}:`, error);
    logConfigChange(
      req,
      'UPDATE',
      'secure-config/global',
      'failure',
      `Failed to restore from backup ${req.params.backupId}: ${error.message}`
    );
    return ApiResponse.error(res, 'Failed to restore from backup', 500);
  }
});

export default router;
