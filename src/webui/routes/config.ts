import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
import { auditMiddleware, AuditedRequest, logConfigChange } from '../middleware/audit';

const router = Router();

// Apply audit middleware to all config routes
router.use(auditMiddleware);

// Get all configuration with sensitive data redacted
router.get('/api/config', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const warnings = manager.getWarnings();
    
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
      } : undefined
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

export default router;
