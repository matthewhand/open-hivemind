import { Router } from 'express';
import { SecureConfigManager, SecureConfig } from '@config/SecureConfigManager';

const router = Router();

// Get all secure configurations (metadata only)
router.get('/api/secure-configs', (req, res) => {
  try {
    const manager = SecureConfigManager.getInstance();
    const configs = manager.listConfigs();
    res.json({ configs });
  } catch (error) {
    console.error('Secure configs API error:', error);
    res.status(500).json({ error: 'Failed to get secure configurations' });
  }
});

// Get a specific secure configuration
router.get('/api/secure-configs/:name', (req, res) => {
  try {
    const manager = SecureConfigManager.getInstance();
    const config = manager.loadConfig(req.params.name);

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ config });
  } catch (error) {
    console.error('Secure config API error:', error);
    res.status(500).json({ error: 'Failed to get secure configuration' });
  }
});

// Create or update a secure configuration
router.post('/api/secure-configs', (req, res) => {
  try {
    const { name, data, encryptSensitive = true } = req.body;

    if (!name || !data) {
      return res.status(400).json({
        error: 'Missing required fields: name and data'
      });
    }

    const manager = SecureConfigManager.getInstance();
    const config = manager.saveConfig(name, data, encryptSensitive);

    res.json({
      success: true,
      message: `Configuration '${name}' saved securely`,
      config: {
        ...config,
        data: {} // Don't return actual data in response
      }
    });
  } catch (error) {
    console.error('Save secure config error:', error);
    res.status(500).json({ error: 'Failed to save secure configuration' });
  }
});

// Delete a secure configuration
router.delete('/api/secure-configs/:name', (req, res) => {
  try {
    const manager = SecureConfigManager.getInstance();
    const deleted = manager.deleteConfig(req.params.name);

    if (!deleted) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({
      success: true,
      message: `Configuration '${req.params.name}' deleted successfully`
    });
  } catch (error) {
    console.error('Delete secure config error:', error);
    res.status(500).json({ error: 'Failed to delete secure configuration' });
  }
});

// Create a backup of all secure configurations
router.post('/api/secure-configs/backup', (req, res) => {
  try {
    const manager = SecureConfigManager.getInstance();
    const backupFile = manager.backupConfigs();

    res.json({
      success: true,
      message: 'Backup created successfully',
      backupFile
    });
  } catch (error) {
    console.error('Backup secure configs error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore from a backup file
router.post('/api/secure-configs/restore', (req, res) => {
  try {
    const { backupFile } = req.body;

    if (!backupFile) {
      return res.status(400).json({ error: 'Backup file path is required' });
    }

    const manager = SecureConfigManager.getInstance();
    const restored = manager.restoreFromBackup(backupFile);

    if (!restored) {
      return res.status(400).json({ error: 'Failed to restore from backup' });
    }

    res.json({
      success: true,
      message: 'Configuration restored from backup successfully'
    });
  } catch (error) {
    console.error('Restore secure configs error:', error);
    res.status(500).json({ error: 'Failed to restore from backup' });
  }
});

// Get secure configuration directory info
router.get('/api/secure-configs/info', (req, res) => {
  try {
    const manager = SecureConfigManager.getInstance();
    const configDir = manager.getConfigDirectory();

    const fs = require('fs');
    const stats = fs.statSync(configDir);
    const files = fs.readdirSync(configDir)
      .filter((file: string) => file.endsWith('.json'))
      .length;

    res.json({
      configDirectory: configDir,
      totalConfigs: files,
      directorySize: stats.size,
      lastModified: stats.mtime
    });
  } catch (error) {
    console.error('Secure config info error:', error);
    res.status(500).json({ error: 'Failed to get configuration info' });
  }
});

export default router;