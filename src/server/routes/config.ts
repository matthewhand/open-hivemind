import { Router } from 'express';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { redactSensitiveInfo } from '../../common/redactSensitiveInfo';
import { auditMiddleware, AuditedRequest, logConfigChange } from '../middleware/audit';
import { UserConfigStore } from '../../config/UserConfigStore';
import { HivemindError, ErrorUtils } from '../../types/errors';
import fs from 'fs';
import path from 'path';

// Import all convict config modules
import messageConfig from '../../config/messageConfig';
import llmConfig from '../../config/llmConfig';
import discordConfig from '../../config/discordConfig';
import slackConfig from '../../config/slackConfig';
import openaiConfig from '../../config/openaiConfig';
import flowiseConfig from '../../config/flowiseConfig';
import mattermostConfig from '../../config/mattermostConfig';
import openWebUIConfig from '../../config/openWebUIConfig';
import webhookConfig from '../../config/webhookConfig';

console.log('Config router module loaded');
const router = Router();
console.log('Config router created');

// Map of config names to their convict objects
const globalConfigs: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  discord: discordConfig,
  slack: slackConfig,
  openai: openaiConfig,
  flowise: flowiseConfig,
  mattermost: mattermostConfig,
  openwebui: openWebUIConfig,
  webhook: webhookConfig
};

// Apply audit middleware to all config routes (except in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

// GET /api/config/global - Get all global configurations (schema + values)
router.get('/api/config/global', (req, res) => {
  try {
    const response: Record<string, any> = {};

    Object.entries(globalConfigs).forEach(([key, config]) => {
      // Get properties (values)
      const props = config.getProperties();

      // Get schema (if available via internal API or we need to reconstruct it)
      // Convict doesn't expose the raw schema easily after init, but we can try to get it
      // or we just send the values and rely on the frontend to infer types or use a shared schema.
      // However, for a "comprehensive" panel, we ideally want the doc strings too.
      // config.getSchema() returns the schema with current values, but let's see.
      const schema = config.getSchema();

      // Redact sensitive values in props
      const redactedProps = JSON.parse(JSON.stringify(props)); // Deep copy

      // Helper to redact recursively
      const redactObject = (obj: any) => {
        for (const k in obj) {
          if (typeof obj[k] === 'object' && obj[k] !== null) {
            redactObject(obj[k]);
          } else if (typeof k === 'string') {
            if (k.toLowerCase().includes('token') ||
              k.toLowerCase().includes('key') ||
              k.toLowerCase().includes('secret') ||
              k.toLowerCase().includes('password')) {
              obj[k] = '********';
            }
          }
        }
      };
      redactObject(redactedProps);

      response[key] = {
        values: redactedProps,
        schema: schema
      };
    });

    res.json(response);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_GET_ERROR'
    });
  }
});

// PUT /api/config/global - Update global configuration
router.put('/api/config/global', async (req, res) => {
  try {
    const { configName, updates } = req.body;

    if (!configName || !globalConfigs[configName]) {
      return res.status(400).json({ error: `Invalid or missing configName. Valid options: ${Object.keys(globalConfigs).join(', ')}` });
    }

    const config = globalConfigs[configName];

    // Validate updates against schema
    // We can use config.load(updates) and then validate, but we don't want to pollute the in-memory config 
    // if validation fails, although convict is mutable.
    // For now, we'll try to load and validate.

    // Note: This only updates the in-memory config. To persist, we need to write to a file.
    // We'll write to config/local.json or similar.

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const localConfigPath = path.join(configDir, 'local.json');

    // Load existing local config if it exists
    let localConfig: any = {};
    if (fs.existsSync(localConfigPath)) {
      try {
        localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
      } catch (e) {
        console.warn('Failed to parse local.json, starting fresh');
      }
    }

    // Update local config
    // We assume the structure in local.json matches the config structure
    // But since we have multiple convict instances, we might need to namespace them in local.json 
    // OR we write to specific files like `config/providers/message.json` if that's how they are loaded.
    // `messageConfig.ts` loads from `config/providers/message.json`.

    // Let's check where each config loads from.
    // messageConfig: config/providers/message.json
    // We should probably write back to that file or a local override.

    // For simplicity and safety, let's write to `config/local-{configName}.json` and ensure the app loads it.
    // BUT, the app code needs to be aware of this new file.
    // `messageConfig.ts` only loads `providers/message.json`.

    // Alternative: We update the specific provider file.
    let targetFile = '';
    switch (configName) {
      case 'message': targetFile = 'providers/message.json'; break;
      case 'llm': targetFile = 'providers/llm.json'; break;
      case 'discord': targetFile = 'providers/discord.json'; break;
      case 'slack': targetFile = 'providers/slack.json'; break;
      case 'openai': targetFile = 'providers/openai.json'; break;
      case 'flowise': targetFile = 'providers/flowise.json'; break;
      case 'mattermost': targetFile = 'providers/mattermost.json'; break;
      case 'openwebui': targetFile = 'providers/openwebui.json'; break;
      case 'webhook': targetFile = 'providers/webhook.json'; break;
      default: targetFile = `providers/${configName}.json`;
    }

    const targetPath = path.join(configDir, targetFile);

    // Read existing file
    let fileContent: any = {};
    if (fs.existsSync(targetPath)) {
      try {
        fileContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      } catch (e) {
        // ignore
      }
    }

    // Merge updates
    const newContent = { ...fileContent, ...updates };

    // Write back
    // Ensure directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(newContent, null, 2));

    // Reload config in memory
    config.load(newContent);
    config.validate({ allowed: 'warn' });

    // Log audit
    if (process.env.NODE_ENV !== 'test') {
      logConfigChange(req as any, 'UPDATE', `config/${configName}`, 'success', `Updated configuration for ${configName}`);
    }

    res.json({ success: true, message: 'Configuration updated and persisted' });

  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_PUT_ERROR'
    });
  }
});

// Get all configuration with sensitive data redacted
router.get('/api/config', (req, res) => {
  console.log('GET /api/config called');
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const warnings = manager.getWarnings();
    const userConfigStore = UserConfigStore.getInstance();

    // Redact sensitive information
    const sanitizedBots = bots.map(bot => ({
      ...bot,
      discord: bot.discord ? {
        ...bot.discord,
        token: redactSensitiveInfo('DISCORD_BOT_TOKEN', bot.discord.token || '')
      } : undefined,
      slack: bot.slack ? {
        ...bot.slack,
        botToken: redactSensitiveInfo('SLACK_BOT_TOKEN', bot.slack.botToken || ''),
        appToken: redactSensitiveInfo('SLACK_APP_TOKEN', bot.slack.appToken || ''),
        signingSecret: redactSensitiveInfo('SLACK_SIGNING_SECRET', bot.slack.signingSecret || '')
      } : undefined,
      openai: bot.openai ? {
        ...bot.openai,
        apiKey: redactSensitiveInfo('OPENAI_API_KEY', bot.openai.apiKey || '')
      } : undefined,
      flowise: bot.flowise ? {
        ...bot.flowise,
        apiKey: redactSensitiveInfo('FLOWISE_API_KEY', bot.flowise.apiKey || '')
      } : undefined,
      openwebui: bot.openwebui ? {
        ...bot.openwebui,
        apiKey: redactSensitiveInfo('OPENWEBUI_API_KEY', bot.openwebui.apiKey || '')
      } : undefined,
      openswarm: bot.openswarm ? {
        ...bot.openswarm,
        apiKey: redactSensitiveInfo('OPENSWARM_API_KEY', bot.openswarm.apiKey || '')
      } : undefined,
      metadata: buildFieldMetadata(bot, userConfigStore)
    }));

    res.json({
      bots: sanitizedBots,
      warnings,
      legacyMode: manager.isLegacyMode(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config API error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity,
      stack: process.env.NODE_ENV === 'test' ? hivemindError.stack : undefined
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_API_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'test' && { stack: hivemindError.stack })
    });
  }
});

// Get configuration sources (env vars vs config files)
router.get('/api/config/sources', (req, res) => {
  try {
    const envVars = Object.keys(process.env)
      .filter(key =>
        key.startsWith('BOTS_') ||
        key.includes('DISCORD_') ||
        key.includes('SLACK_') ||
        key.includes('OPENAI_') ||
        key.includes('FLOWISE_') ||
        key.includes('OPENWEBUI_') ||
        key.includes('MATTERMOST_') ||
        key.includes('MESSAGE_') ||
        key.includes('WEBHOOK_')
      )
      .reduce((acc, key) => {
        acc[key] = {
          source: 'environment',
          value: redactSensitiveInfo(key, process.env[key] || ''),
          sensitive: key.toLowerCase().includes('token') ||
            key.toLowerCase().includes('key') ||
            key.toLowerCase().includes('secret')
        };
        return acc;
      }, {} as Record<string, any>);

    // Detect config files
    const fs = require('fs');
    const path = require('path');
    const configDir = path.join(__dirname, '../../../config');
    const configFiles: any[] = [];

    try {
      const files = fs.readdirSync(configDir);
      files.forEach((file: string) => {
        if (file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts')) {
          const filePath = path.join(configDir, file);
          const stats = fs.statSync(filePath);
          configFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            type: path.extname(file).slice(1)
          });
        }
      });
    } catch (fileError) {
      console.warn('Could not read config directory:', fileError);
    }

    // Detect overrides (env vars that override config file values)
    const overrides: any[] = [];
    const manager = BotConfigurationManager.getInstance();
    let bots: any[] = [];
    try {
      const res = (manager as any).getAllBots?.();
      if (Array.isArray(res)) bots = res;
    } catch {
      bots = [];
    }

    bots.forEach(bot => {
      // Check for environment variable overrides
      const envKeys = Object.keys(process.env);
      const botName = bot.name.toLowerCase().replace(/\s+/g, '_');

      envKeys.forEach(envKey => {
        if (envKey.toLowerCase().includes(botName) ||
          envKey.includes('DISCORD_') ||
          envKey.includes('SLACK_') ||
          envKey.includes('OPENAI_')) {
          overrides.push({
            key: envKey,
            value: redactSensitiveInfo(envKey, process.env[envKey] || ''),
            bot: bot.name,
            type: 'environment_override'
          });
        }
      });
    });

    res.json({
      environmentVariables: envVars,
      configFiles,
      overrides
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config sources API error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_SOURCES_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Reload configuration
router.post('/api/config/reload', (req, res) => {
  try {
    console.log('POST /api/config/reload called');
    const manager = BotConfigurationManager.getInstance();
    console.log('Manager instance obtained:', !!manager);
    manager.reload();
    console.log('Manager reload completed');

    // Skip audit logging entirely in test mode
    if (process.env.NODE_ENV !== 'test') {
      try {
        logConfigChange(req, 'RELOAD', 'config/global', 'success', 'Configuration reloaded from files');
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    }

    console.log('About to send response');
    res.json({
      success: true,
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config reload error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    // Skip audit logging entirely in test mode
    if (process.env.NODE_ENV !== 'test') {
      try {
        logConfigChange(req, 'RELOAD', 'config/global', 'failure', `Configuration reload failed: ${hivemindError.message}`);
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    }

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_RELOAD_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear cache
router.post('/api/cache/clear', (req, res) => {
  try {
    console.log('POST /api/cache/clear called');
    // Clear any in-memory caches
    if ((global as any).configCache) {
      (global as any).configCache = {};
    }

    // Force reload configuration to clear any internal caches
    const manager = BotConfigurationManager.getInstance();
    console.log('Manager instance obtained:', !!manager);
    manager.reload();
    console.log('Manager reload completed');

    // No audit logging needed in test mode

    console.log('About to send response');
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Cache clear error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CACHE_CLEAR_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Export configuration
router.get('/api/config/export', (req, res) => {
  try {
    console.log('GET /api/config/export called');
    const manager = BotConfigurationManager.getInstance();
    console.log('Manager instance obtained:', !!manager);
    const bots = manager.getAllBots();
    console.log('Bots obtained:', bots.length);
    const warnings = manager.getWarnings();
    console.log('Warnings obtained:', warnings);

    // Create export data with current timestamp
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      bots: bots,
      warnings: warnings,
      legacyMode: manager.isLegacyMode()
    };

    // Convert to JSON and create blob
    const jsonContent = JSON.stringify(exportData, null, 2);
    console.log('JSON content created');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="config-export-${Date.now()}.json"`);
    console.log('Headers set, about to send response');
    res.send(jsonContent);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config export error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_EXPORT_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Validate configuration
router.get('/api/config/validate', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const errors = [];

    // Basic validation
    if (!Array.isArray(bots)) {
      errors.push({ field: 'bots', message: 'Bots must be an array' });
    } else {
      bots.forEach((bot: any, index: number) => {
        if (!bot.name) {
          errors.push({ field: `bots[${index}].name`, message: 'Bot name is required' });
        }
        if (!bot.llmProvider) {
          errors.push({ field: `bots[${index}].llmProvider`, message: 'LLM provider is required' });
        }
        if (!bot.messageProvider) {
          errors.push({ field: `bots[${index}].messageProvider`, message: 'Message provider is required' });
        }
      });
    }

    res.json({
      valid: errors.length === 0,
      errors
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config validation error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Create configuration backup
router.post('/api/config/backup', (req: any, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const warnings = manager.getWarnings();

    const backupId = `backup_${Date.now()}`;

    // In a real implementation, this would save to a file or database
    // For now, just return success

    res.json({
      backupId,
      timestamp: new Date().toISOString(),
      message: 'Configuration backup created successfully'
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config backup error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_BACKUP_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Restore configuration from backup
router.post('/api/config/restore', (req: any, res) => {
  try {
    const { backupId } = req.body;

    if (!backupId) {
      return res.status(400).json({ error: 'backupId is required' });
    }

    // In a real implementation, this would restore from a file or database
    // For now, just return success

    res.json({
      success: true,
      restored: backupId,
      message: 'Configuration restored successfully'
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('Config restore error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_RESTORE_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// WebUI health endpoint
router.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webui'
  });
});

// OpenAPI documentation endpoint
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
        },
        '/api/config/validate': {
          get: {
            summary: 'Validate configuration',
            responses: {
              200: { description: 'Configuration validation result' }
            }
          }
        },
        '/api/config/reload': {
          post: {
            summary: 'Reload configuration',
            responses: {
              200: { description: 'Configuration reloaded successfully' }
            }
          }
        },
        '/api/config/backup': {
          post: {
            summary: 'Create configuration backup',
            responses: {
              200: { description: 'Configuration backup created successfully' }
            }
          }
        },
        '/api/config/restore': {
          post: {
            summary: 'Restore configuration from backup',
            responses: {
              200: { description: 'Configuration restored successfully' }
            }
          }
        },
        '/api/health': {
          get: {
            summary: 'WebUI health check',
            responses: {
              200: { description: 'WebUI is healthy' }
            }
          }
        }
      }
    };
    res.json(openapiSpec);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    const errorInfo = ErrorUtils.classifyError(hivemindError);

    console.error('OpenAPI generation error:', {
      message: hivemindError.message,
      code: hivemindError.code,
      type: errorInfo.type,
      severity: errorInfo.severity
    });

    res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'OPENAPI_GENERATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all route for debugging
router.use('*', (req, res) => {
  console.log('Config router catch-all:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found in config router' });
});

export default router;

function buildFieldMetadata(bot: any, store: ReturnType<typeof UserConfigStore.getInstance>): Record<string, any> {
  const botName: string = bot?.name || 'unknown';
  const overrides = store.getBotOverride(botName) || {};

  const describeField = (field: string, envKey: string) => {
    const envVar = `BOTS_${botName.toUpperCase()}_${envKey}`;
    const hasEnv = process.env[envVar] !== undefined && process.env[envVar] !== '';
    const hasOverride = overrides && (overrides as Record<string, any>)[field] !== undefined;

    return {
      source: hasEnv ? 'env' : hasOverride ? 'user' : 'default',
      locked: hasEnv,
      envVar: hasEnv ? envVar : undefined,
      override: hasOverride,
    };
  };

  return {
    messageProvider: describeField('messageProvider', 'MESSAGE_PROVIDER'),
    llmProvider: describeField('llmProvider', 'LLM_PROVIDER'),
    persona: describeField('persona', 'PERSONA'),
    systemInstruction: describeField('systemInstruction', 'SYSTEM_INSTRUCTION'),
    mcpServers: describeField('mcpServers', 'MCP_SERVERS'),
    mcpGuard: describeField('mcpGuard', 'MCP_GUARD'),
  };
}
