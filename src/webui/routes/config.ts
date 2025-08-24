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
        key.includes('MATTERMOST_')
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
    
    res.json({
      environmentVariables: envVars,
      configFiles: [], // TODO: Implement config file detection
      overrides: [] // TODO: Implement override detection
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