import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const router = Router();

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
        token: redactSensitiveInfo(bot.discord.token || '', 'DISCORD_BOT_TOKEN')
      } : undefined,
      slack: bot.slack ? {
        ...bot.slack,
        botToken: redactSensitiveInfo(bot.slack.botToken || '', 'SLACK_BOT_TOKEN'),
        appToken: redactSensitiveInfo(bot.slack.appToken || '', 'SLACK_APP_TOKEN'),
        signingSecret: redactSensitiveInfo(bot.slack.signingSecret || '', 'SLACK_SIGNING_SECRET')
      } : undefined,
      openai: bot.openai ? {
        ...bot.openai,
        apiKey: redactSensitiveInfo(bot.openai.apiKey || '', 'OPENAI_API_KEY')
      } : undefined,
      flowise: bot.flowise ? {
        ...bot.flowise,
        apiKey: redactSensitiveInfo(bot.flowise.apiKey || '', 'FLOWISE_API_KEY')
      } : undefined,
      openwebui: bot.openwebui ? {
        ...bot.openwebui,
        apiKey: redactSensitiveInfo(bot.openwebui.apiKey || '', 'OPENWEBUI_API_KEY')
      } : undefined,
      openswarm: bot.openswarm ? {
        ...bot.openswarm,
        apiKey: redactSensitiveInfo(bot.openswarm.apiKey || '', 'OPENSWARM_API_KEY')
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
          value: redactSensitiveInfo(process.env[key] || '', key),
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
    const bots = manager.getAllBots();

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
            value: redactSensitiveInfo(process.env[envKey] || '', envKey),
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
router.post('/api/config/reload', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    manager.reload();
    
    res.json({ 
      success: true, 
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Config reload error:', error);
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

export default router;