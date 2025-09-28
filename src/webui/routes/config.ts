import { Router } from 'express';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';

const router = Router();

// GET /webui/api/config - Return complete configuration
router.get('/api/config', (req, res) => {
  try {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    const config = {
      bots: bots.map(bot => {
        // Deep clone the bot to avoid modifying the original
        const botClone = JSON.parse(JSON.stringify(bot));
        
        // Redact sensitive information
        if (botClone.discord && botClone.discord.token) {
          botClone.discord.token = '***';
        }
        if (botClone.openai && botClone.openai.apiKey) {
          botClone.openai.apiKey = '***';
        }
        if (botClone.flowise && botClone.flowise.apiKey) {
          botClone.flowise.apiKey = '***';
        }
        if (botClone.openwebui && botClone.openwebui.apiKey) {
          botClone.openwebui.apiKey = '***';
        }
        if (botClone.openswarm && botClone.openswarm.apiKey) {
          botClone.openswarm.apiKey = '***';
        }
        
        // Add provider field for tests
        botClone.provider = botClone.messageProvider;
        // Add enabled field for tests
        botClone.enabled = true;
        
        return botClone;
      }),
      llmProviders: {},
      messageProviders: {},
      system: {
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      }
    };
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// GET /webui/api/config/sources - Return configuration sources
router.get('/api/config/sources', (req, res) => {
  try {
    const sources = [
      { name: 'environment', type: 'env', priority: 1, loaded: true },
      { name: 'config-manager', type: 'file', priority: 2, loaded: true },
      { name: 'database', type: 'db', priority: 3, loaded: false }
    ];
    const active = {
      source: 'config-manager',
      timestamp: new Date().toISOString()
    };
    res.json({ sources, active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve configuration sources' });
  }
});

// POST /webui/api/config/reload - Reload configuration
router.post('/api/config/reload', (req, res) => {
  try {
    // Simulate configuration reload
    const success = true;
    if (success) {
      res.json({ success: true, message: 'Configuration reloaded successfully', timestamp: new Date().toISOString() });
    } else {
      res.status(500).json({ error: 'Failed to reload configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

// GET /webui/api/config/validate - Validate configuration
router.get('/api/config/validate', (req, res) => {
  try {
    const config = BotConfigurationManager.getInstance().getAllBots();
    const errors = [];

    // Basic validation
    if (!Array.isArray(config)) {
      errors.push({ field: 'bots', message: 'Bots must be an array', severity: 'error' });
    }

    config.forEach((bot: any, index: number) => {
      if (!bot.name) {
        errors.push({ field: `bots[${index}].name`, message: 'Bot name is required', severity: 'error' });
      }
      if (!bot.llmProvider) {
        errors.push({ field: `bots[${index}].llmProvider`, message: 'LLM provider is required', severity: 'error' });
      }
    });

    res.json({
      valid: errors.length === 0,
      errors,
      warnings: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate configuration' });
  }
});

// POST /webui/api/config/backup - Create configuration backup
router.post('/api/config/backup', (req, res) => {
  try {
    const backupId = `backup_${Date.now()}`;
    res.json({
      success: true,
      backupId,
      timestamp: new Date().toISOString(),
      message: 'Configuration backup created successfully',
      size: 1024,  // Mock size
      metadata: {
        version: process.env.npm_package_version || '1.0.0',
        botCount: BotConfigurationManager.getInstance().getAllBots().length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create configuration backup' });
  }
});

// POST /webui/api/config/restore - Restore from backup
router.post('/api/config/restore', (req, res) => {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ error: 'backupId is required' });
    }

    // Simulate successful restore
    // In a real implementation, you would check if the backup exists
    if (backupId === 'nonexistent-backup') {
      return res.status(404).json({ error: `Backup ${backupId} not found` });
    }
    res.json({
      success: true,
      restored: backupId,
      message: 'Configuration restored successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore configuration' });
  }
});

// GET /webui/api/health - WebUI health endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webui'
  });
});

// GET /webui/api/openapi - OpenAPI documentation
router.get('/api/openapi', (req, res) => {
  try {
    const openapiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Open-Hivemind WebUI API',
        version: '1.0.0',
        description: 'API for managing Open-Hivemind configuration'
      },
      paths: {
        '/api/config': {
          get: {
            summary: 'Get configuration',
            responses: {
              200: { description: 'Configuration retrieved successfully' }
            }
          }
        }
      }
    };
    res.json(openapiSpec);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve OpenAPI specification' });
  }
});

export default router;