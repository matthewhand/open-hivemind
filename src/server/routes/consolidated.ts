import Debug from 'debug';
import { Router } from 'express';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { auditMiddleware, logAdminAction } from '../middleware/audit';
import { authenticateToken, requirePermission } from '../middleware/auth';

const debug = Debug('app:webui:consolidated');
const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateToken);
router.use(requirePermission('admin'));

// GET /api/webui/system-status - Consolidated system status
router.get('/system-status', async (req, res) => {
  try {
    const botManager = BotConfigurationManager.getInstance();
    const dbManager = DatabaseManager.getInstance();

    const bots = botManager.getAllBots();
    const activeBots = bots.filter((bot) => (bot as any).enabled !== false);

    let dbStats = null;
    try {
      if (dbManager.isConnected()) {
        dbStats = await dbManager.getStats();
      }
    } catch (error) {
      debug('Error getting database stats:', error);
    }

    const systemStatus = {
      timestamp: new Date().toISOString(),
      bots: {
        total: bots.length,
        active: activeBots.length,
        configured: bots.filter((bot) => bot.messageProvider && bot.llmProvider).length,
      },
      database: {
        connected: dbManager.isConnected(),
        stats: dbStats,
      },
      system: {
        uptime: process.uptime() * 1000,
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        hasEnvOverrides: Object.keys(process.env).some((key) =>
          /^(DISCORD_|SLACK_|TELEGRAM_|MATTERMOST_|OPENAI_|FLOWISE_|OPENWEBUI_)/.test(key)
        ),
      },
    };

    logAdminAction(req as any, 'VIEW', 'system-status', 'success', 'System status retrieved');
    return res.json({ success: true, data: systemStatus });
  } catch (error) {
    debug('Error getting system status:', error);
    logAdminAction(req as any, 'VIEW', 'system-status', 'failure', `Error: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/webui/providers - Get available providers with configuration status
router.get('/providers', async (req, res) => {
  try {
    const messageProviders = [
      {
        id: 'discord',
        name: 'Discord',
        description: 'Discord bot integration',
        requiredEnvVars: ['DISCORD_TOKEN'],
        configured: !!process.env.DISCORD_TOKEN,
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Slack bot integration',
        requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
        configured: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN),
      },
      {
        id: 'telegram',
        name: 'Telegram',
        description: 'Telegram bot integration',
        requiredEnvVars: ['TELEGRAM_BOT_TOKEN'],
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
      },
      {
        id: 'mattermost',
        name: 'Mattermost',
        description: 'Mattermost bot integration',
        requiredEnvVars: ['MATTERMOST_TOKEN', 'MATTERMOST_SERVER_URL'],
        configured: !!(process.env.MATTERMOST_TOKEN && process.env.MATTERMOST_SERVER_URL),
      },
    ];

    const llmProviders = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI GPT models',
        requiredEnvVars: ['OPENAI_API_KEY'],
        configured: !!process.env.OPENAI_API_KEY,
      },
      {
        id: 'flowise',
        name: 'Flowise',
        description: 'Flowise workflow engine',
        requiredEnvVars: ['FLOWISE_BASE_URL'],
        configured: !!process.env.FLOWISE_BASE_URL,
      },
      {
        id: 'openwebui',
        name: 'Open WebUI',
        description: 'Open WebUI local models',
        requiredEnvVars: ['OPENWEBUI_BASE_URL'],
        configured: !!process.env.OPENWEBUI_BASE_URL,
      },
    ];

    return res.json({
      success: true,
      data: { messageProviders, llmProviders },
    });
  } catch (error) {
    debug('Error getting providers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get providers',
    });
  }
});

// GET /api/webui/env-status - Get environment variable status
router.get('/env-status', async (req, res) => {
  try {
    const envStatus: Record<string, { isSet: boolean; redactedValue?: string }> = {};

    const checkEnvVars = [
      'DISCORD_TOKEN',
      'SLACK_BOT_TOKEN',
      'SLACK_APP_TOKEN',
      'TELEGRAM_BOT_TOKEN',
      'MATTERMOST_TOKEN',
      'MATTERMOST_SERVER_URL',
      'OPENAI_API_KEY',
      'FLOWISE_BASE_URL',
      'OPENWEBUI_BASE_URL',
      'MCP_SERVER_URL',
    ];

    checkEnvVars.forEach((varName) => {
      const value = process.env[varName];
      envStatus[varName] = {
        isSet: !!value,
        redactedValue: value ? `***${value.slice(-4)}` : undefined,
      };
    });

    logAdminAction(req as any, 'VIEW', 'env-status', 'success', 'Environment status retrieved');
    return res.json({ success: true, data: envStatus });
  } catch (error) {
    debug('Error getting environment status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get environment status',
    });
  }
});

// POST /api/webui/validate-config - Validate bot configuration
router.post('/validate-config', async (req, res) => {
  try {
    const { botConfig } = req.body;

    if (!botConfig) {
      return res.status(400).json({
        success: false,
        error: 'Bot configuration is required',
      });
    }

    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Validate required fields
    if (!botConfig.name) {
      validation.errors.push('Bot name is required');
      validation.isValid = false;
    }

    if (!botConfig.messageProvider) {
      validation.errors.push('Message provider is required');
      validation.isValid = false;
    }

    if (!botConfig.llmProvider) {
      validation.errors.push('LLM provider is required');
      validation.isValid = false;
    }

    // Check environment variable availability
    const providerEnvMap: Record<string, string[]> = {
      discord: ['DISCORD_TOKEN'],
      slack: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
      telegram: ['TELEGRAM_BOT_TOKEN'],
      mattermost: ['MATTERMOST_TOKEN', 'MATTERMOST_SERVER_URL'],
      openai: ['OPENAI_API_KEY'],
      flowise: ['FLOWISE_BASE_URL'],
      openwebui: ['OPENWEBUI_BASE_URL'],
    };

    if (botConfig.messageProvider && providerEnvMap[botConfig.messageProvider]) {
      const requiredVars = providerEnvMap[botConfig.messageProvider];
      const missingVars = requiredVars.filter((varName) => !process.env[varName]);

      if (missingVars.length > 0) {
        validation.warnings.push(
          `Missing environment variables for ${botConfig.messageProvider}: ${missingVars.join(', ')}`
        );
      }
    }

    if (botConfig.llmProvider && providerEnvMap[botConfig.llmProvider]) {
      const requiredVars = providerEnvMap[botConfig.llmProvider];
      const missingVars = requiredVars.filter((varName) => !process.env[varName]);

      if (missingVars.length > 0) {
        validation.warnings.push(
          `Missing environment variables for ${botConfig.llmProvider}: ${missingVars.join(', ')}`
        );
      }
    }

    // Validate MCP guard configuration
    if (botConfig.mcpGuard?.enabled) {
      if (
        botConfig.mcpGuard.type === 'custom' &&
        (!botConfig.mcpGuard.allowedUserIds || botConfig.mcpGuard.allowedUserIds.length === 0)
      ) {
        validation.warnings.push('Custom MCP guard enabled but no allowed user IDs specified');
      }
    }

    logAdminAction(
      req as any,
      'VALIDATE',
      'bot-config',
      'success',
      `Config validation: ${validation.isValid ? 'valid' : 'invalid'}`
    );
    return res.json({ success: true, data: validation });
  } catch (error) {
    debug('Error validating config:', error);
    logAdminAction(req as any, 'VALIDATE', 'bot-config', 'failure', `Error: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate configuration',
    });
  }
});

// GET /api/webui/health - Comprehensive health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {
        database: {
          status: 'unknown',
          connected: false,
          error: null as string | null,
        },
        botManager: {
          status: 'healthy',
          botsLoaded: 0,
        },
        environment: {
          status: 'unknown',
          missingVars: [] as string[],
        },
      },
    };

    // Check database
    try {
      const dbManager = DatabaseManager.getInstance();
      health.checks.database.connected = dbManager.isConnected();
      health.checks.database.status = health.checks.database.connected ? 'healthy' : 'warning';

      if (health.checks.database.connected) {
        await dbManager.getStats(); // Test query
      }
    } catch (error) {
      health.checks.database.status = 'error';
      health.checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check bot manager
    try {
      const botManager = BotConfigurationManager.getInstance();
      const bots = botManager.getAllBots();
      health.checks.botManager.botsLoaded = bots.length;
    } catch (error) {
      health.checks.botManager.status = 'error';
    }

    // Check critical environment variables
    const criticalEnvVars = ['NODE_ENV'];
    health.checks.environment.missingVars = criticalEnvVars.filter(
      (varName) => !process.env[varName]
    );
    health.checks.environment.status =
      health.checks.environment.missingVars.length > 0 ? 'warning' : 'healthy';

    // Determine overall status
    const hasErrors = Object.values(health.checks).some((check) => check.status === 'error');
    const hasWarnings = Object.values(health.checks).some((check) => check.status === 'warning');

    health.status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy';

    return res.json({ success: true, data: health });
  } catch (error) {
    debug('Error getting health status:', error);
    const { createErrorResponse } = await import('../../utils/errorResponse');
    const errorResponse = createErrorResponse(error as Error, req.path);
    return res.status(errorResponse.getStatusCode() || 500).json({
      success: false,
      ...errorResponse,
    });
  }
});

// GET /api/webui/metrics - System metrics for monitoring
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
      },
      application: {
        bots: {
          total: 0,
          active: 0,
        },
        database: {
          connected: false,
          stats: null as any,
        },
      },
    };

    // Get bot metrics
    try {
      const botManager = BotConfigurationManager.getInstance();
      const bots = botManager.getAllBots();
      metrics.application.bots.total = bots.length;
      metrics.application.bots.active = bots.filter((bot) => (bot as any).enabled !== false).length;
    } catch (error) {
      debug('Error getting bot metrics:', error);
    }

    // Get database metrics
    try {
      const dbManager = DatabaseManager.getInstance();
      metrics.application.database.connected = dbManager.isConnected();

      if (metrics.application.database.connected) {
        metrics.application.database.stats = await dbManager.getStats();
      }
    } catch (error) {
      debug('Error getting database metrics:', error);
    }

    return res.json({ success: true, data: metrics });
  } catch (error) {
    debug('Error getting metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
});

export default router;
