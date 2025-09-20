import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import { auditMiddleware, AuditedRequest, logConfigChange } from '../middleware/audit';
import UserConfigStore from '@config/UserConfigStore';

const router = Router();

// Apply audit middleware to all config routes
router.use(auditMiddleware);

// Get all configuration with sensitive data redacted
router.get('/api/config', (req, res) => {
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
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
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
  } catch (error) {
    console.error('Config sources API error:', error);
    res.status(500).json({ error: 'Failed to get configuration sources' });
  }
});

// Reload configuration
router.post('/api/config/reload', (req: AuditedRequest, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    manager.reload();

    logConfigChange(req, 'RELOAD', 'config/global', 'success', 'Configuration reloaded from files');

    res.json({
      success: true,
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Config reload error:', error);
    logConfigChange(req, 'RELOAD', 'config/global', 'failure', `Configuration reload failed: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

// Clear cache
router.post('/api/cache/clear', (req: AuditedRequest, res) => {
  try {
    // Clear any in-memory caches
    if ((global as any).configCache) {
      (global as any).configCache = {};
    }

    // Force reload configuration to clear any internal caches
    const manager = BotConfigurationManager.getInstance();
    manager.reload();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Export configuration
router.get('/api/config/export', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const warnings = manager.getWarnings();

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

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="config-export-${Date.now()}.json"`);
    res.send(jsonContent);
  } catch (error) {
    console.error('Config export error:', error);
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

export default router;

function buildFieldMetadata(bot: any, store: ReturnType<typeof UserConfigStore.getInstance>): Record<string, any> {
  const botName: string = bot?.name || 'unknown';
  const overrides = store.getBotOverride(botName) || {};

  const describeField = (field: keyof typeof overrides, envKey: string) => {
    const envVar = `BOTS_${botName.toUpperCase()}_${envKey}`;
    const hasEnv = process.env[envVar] !== undefined && process.env[envVar] !== '';
    const hasOverride = overrides[field] !== undefined;

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
