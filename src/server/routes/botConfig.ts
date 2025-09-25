import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AuthMiddlewareRequest } from '../../auth/types';
import Debug from 'debug';
import { auditMiddleware, AuditedRequest, logConfigChange } from '../middleware/audit';
import { BotConfigurationManager, BotConfig } from '../../config/BotConfigurationManager';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ConfigurationValidator } from '../services/ConfigurationValidator';
import { validateBotConfigCreation, validateBotConfigUpdate, sanitizeBotConfig } from '../middleware/formValidation';
import { BotConfigService } from '../services/BotConfigService';

const debug = Debug('app:BotConfigRoutes');
const router = Router();
const botConfigManager = BotConfigurationManager.getInstance();
const secureConfigManager = SecureConfigManager.getInstance();
const userConfigStore = UserConfigStore.getInstance();
const dbManager = DatabaseManager.getInstance();
const configValidator = new ConfigurationValidator();

// Apply authentication and audit middleware
router.use(authenticate, auditMiddleware);

/**
 * GET /webui/api/bot-config
 * Get all bot configurations with full details
 */
router.get('/', async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const bots = botConfigManager.getAllBots();
    const warnings = botConfigManager.getWarnings();

    // Get user overrides for each bot
    const botsWithOverrides = bots.map(bot => {
      const overrides = userConfigStore.getBotOverride(bot.name);
      return {
        ...bot,
        overrides: overrides || {},
        metadata: {
          source: overrides ? 'user_override' : 'default',
          lastModified: overrides?.updatedAt || new Date().toISOString(),
          isActive: true
        }
      };
    });

    res.json({
      success: true,
      data: {
        bots: botsWithOverrides,
        warnings,
        total: botsWithOverrides.length,
        legacyMode: botConfigManager.isLegacyMode()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    debug('Error getting bot configurations:', error);
    res.status(500).json({
      error: 'Failed to get bot configurations',
      message: error.message || 'An error occurred while retrieving bot configurations'
    });
  }
});

/**
 * GET /webui/api/bot-config/:botId
 * Get a specific bot configuration
 */
router.get('/:botId', async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const bot = botConfigManager.getBot(botId);

    if (!bot) {
      return res.status(404).json({
        error: 'Bot configuration not found',
        message: `Bot configuration with ID ${botId} not found`
      });
    }

    const overrides = userConfigStore.getBotOverride(bot.name);

    res.json({
      success: true,
      data: {
        bot: {
          ...bot,
          overrides: overrides || {},
          metadata: {
            source: overrides ? 'user_override' : 'default',
            lastModified: overrides?.updatedAt || new Date().toISOString(),
            isActive: true
          }
        }
      }
    });
  } catch (error: any) {
    debug('Error getting bot configuration:', error);
    res.status(500).json({
      error: 'Failed to get bot configuration',
      message: error.message || 'An error occurred while retrieving bot configuration'
    });
  }
});

/**
 * POST /webui/api/bot-config
 * Create a new bot configuration (admin only)
 */
router.post('/', requireAdmin, validateBotConfigCreation, sanitizeBotConfig, async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const configData = req.body;
    const createdBy = authReq.user?.username || 'unknown';

    // Use BotConfigService to create the configuration
    const botConfigService = BotConfigService.getInstance();
    const newBot = await botConfigService.createBotConfig(configData, createdBy);

    logConfigChange(req, 'CREATE', newBot.name, 'success', 'Bot configuration created successfully', {
      newValue: newBot
    });

    res.status(201).json({
      success: true,
      data: { bot: newBot },
      message: 'Bot configuration created successfully'
    });
  } catch (error: any) {
    debug('Error creating bot configuration:', error);
    logConfigChange(req, 'CREATE', req.body?.name || 'unknown', 'failure', `Failed to create bot configuration: ${error.message}`);
    res.status(400).json({
      error: 'Failed to create bot configuration',
      message: error.message || 'An error occurred while creating bot configuration'
    });
  }
});

/**
 * PUT /webui/api/bot-config/:botId
 * Update an existing bot configuration (admin only)
 */
router.put('/:botId', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const updates = req.body;

    // Get existing bot for comparison
    const existingBot = botConfigManager.getBot(botId);
    if (!existingBot) {
      logConfigChange(req, 'UPDATE', botId, 'failure', 'Bot configuration not found');
      return res.status(404).json({
        error: 'Bot configuration not found',
        message: `Bot configuration with ID ${botId} not found`
      });
    }

    // Validate updated configuration using convict schema
    const schemaValidationResult = configValidator.validateBotConfigWithSchema({ ...existingBot, ...updates });
    if (!schemaValidationResult.isValid) {
      logConfigChange(req, 'UPDATE', botId, 'failure', `Schema validation failed: ${schemaValidationResult.errors.join(', ')}`);
      return res.status(400).json({
        error: 'Schema validation error',
        message: 'Configuration schema validation failed',
        details: schemaValidationResult.errors
      });
    }

    // Additional business logic validation
    const businessValidationResult = configValidator.validateBotConfig({ ...existingBot, ...updates });
    if (!businessValidationResult.isValid) {
      logConfigChange(req, 'UPDATE', botId, 'failure', `Business validation failed: ${businessValidationResult.errors.join(', ')}`);
      return res.status(400).json({
        error: 'Business validation error',
        message: 'Configuration business validation failed',
        details: businessValidationResult.errors,
        warnings: businessValidationResult.warnings,
        suggestions: businessValidationResult.suggestions
      });
    }

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const diff = JSON.stringify({
      old: existingBot,
      new: { ...existingBot, ...updates },
    });

    const approvalRequestId = await dbManager.createApprovalRequest({
      resourceType: 'BotConfiguration',
      resourceId: botId, // Use bot name as resource ID
      changeType: 'UPDATE',
      requestedBy: req.user.username,
      diff,
    });

    res.json({
      success: true,
      message: 'Bot configuration update requires approval.',
      approvalRequestId,
    });
  } catch (error: any) {
    debug('Error updating bot configuration:', error);
    logConfigChange(req, 'UPDATE', req.params.botId, 'failure', `Failed to update bot configuration: ${error.message}`);
    res.status(400).json({
      error: 'Failed to update bot configuration',
      message: error.message || 'An error occurred while updating bot configuration'
    });
  }
});

router.post('/:botId/apply-update', requireRole('admin'), async (req: Request, res: Response) => {
  const { botId } = req.params;
  const { approvalId } = req.body;

  try {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const approvalRequest = await dbManager.getApprovalRequest(approvalId);
    if (!approvalRequest || approvalRequest.status !== 'approved' || approvalRequest.resourceId !== parseInt(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or not approved approval request for this bot configuration.',
      });
    }

    const diff = JSON.parse(approvalRequest.diff);
    const updates = diff.new;

    // Update user overrides
    userConfigStore.setBotOverride(botId, {
      messageProvider: updates.messageProvider,
      llmProvider: updates.llmProvider,
      persona: updates.persona,
      systemInstruction: updates.systemInstruction,
      mcpServers: updates.mcpServers,
      mcpGuard: updates.mcpGuard
    });

    // Update secure config if sensitive data changed
    if (updates.discord || updates.slack || updates.openai || updates.flowise || updates.openwebui) {
      await secureConfigManager.storeConfig({
        id: botId,
        name: botId,
        type: 'bot',
        data: {
          discord: updates.discord,
          slack: updates.slack,
          openai: updates.openai,
          flowise: updates.flowise,
          openwebui: updates.openwebui
        },
        createdAt: new Date().toISOString()
      });
    }

    // Reload configuration to pick up changes
    botConfigManager.reload();

    // Get updated bot
    const updatedBot = botConfigManager.getBot(botId);
    if (!updatedBot) {
      logConfigChange(req, 'UPDATE', botId, 'failure', 'Bot configuration not found after update');
      return res.status(500).json({
        error: 'Failed to update bot configuration',
        message: 'Bot configuration was not found after update'
      });
    }

    logConfigChange(req, 'UPDATE', botId, 'success', 'Bot configuration updated successfully', {
      oldValue: diff.old,
      newValue: updatedBot
    });

    res.json({
      success: true,
      data: { bot: updatedBot },
      message: 'Bot configuration updated successfully'
    });
  } catch (error: any) {
    debug('Error applying bot configuration update:', error);
    logConfigChange(req, 'UPDATE', botId, 'failure', `Failed to apply bot configuration update: ${error.message}`);
    res.status(400).json({
      error: 'Failed to apply bot configuration update',
      message: error.message || 'An error occurred while applying bot configuration update'
    });
  }
});




/**
 * GET /webui/api/bot-config/templates
 * Get bot configuration templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  const templates = {
    discord_openai: {
      name: 'Discord + OpenAI Bot',
      description: 'A Discord bot using OpenAI for responses',
      messageProvider: 'discord',
      llmProvider: 'openai',
      config: {
        discord: {
          token: 'YOUR_DISCORD_BOT_TOKEN',
          voiceChannelId: 'OPTIONAL_VOICE_CHANNEL_ID'
        },
        openai: {
          apiKey: 'YOUR_OPENAI_API_KEY',
          model: 'gpt-3.5-turbo'
        }
      }
    },
    slack_flowise: {
      name: 'Slack + Flowise Bot',
      description: 'A Slack bot using Flowise for AI responses',
      messageProvider: 'slack',
      llmProvider: 'flowise',
      config: {
        slack: {
          botToken: 'YOUR_SLACK_BOT_TOKEN',
          signingSecret: 'YOUR_SLACK_SIGNING_SECRET',
          appToken: 'OPTIONAL_SLACK_APP_TOKEN'
        },
        flowise: {
          apiKey: 'YOUR_FLOWISE_API_KEY',
          endpoint: 'YOUR_FLOWISE_ENDPOINT'
        }
      }
    },
    mattermost_openwebui: {
      name: 'Mattermost + OpenWebUI Bot',
      description: 'A Mattermost bot using OpenWebUI for responses',
      messageProvider: 'mattermost',
      llmProvider: 'openwebui',
      config: {
        mattermost: {
          serverUrl: 'YOUR_MATTERMOST_SERVER_URL',
          token: 'YOUR_MATTERMOST_TOKEN'
        },
        openwebui: {
          apiKey: 'YOUR_OPENWEBUI_API_KEY',
          endpoint: 'YOUR_OPENWEBUI_ENDPOINT'
        }
      }
    }
  };

  res.json({
    success: true,
    data: { templates }
  });
});


export default router;