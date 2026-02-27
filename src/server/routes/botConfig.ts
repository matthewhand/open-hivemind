import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin, requireRole } from '../../auth/middleware';
import { type AuthMiddlewareRequest } from '../../auth/types';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import { DatabaseManager } from '../../database/DatabaseManager';
import { BotConfig } from '../../types/config';
import { ConfigurationError } from '../../types/errorClasses';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../middleware/audit';
import {
  sanitizeBotConfig,
  validateBotConfigCreation,
  validateBotConfigUpdate,
} from '../middleware/formValidation';
import { BotConfigService } from '../services/BotConfigService';
import { ConfigurationValidator } from '../services/ConfigurationValidator';

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
    const botsWithOverrides = bots.map((bot) => {
      const overrides = userConfigStore.getBotOverride(bot.name);
      return {
        ...bot,
        overrides: overrides || {},
        metadata: {
          source: overrides ? 'user_override' : 'default',
          lastModified: overrides?.updatedAt || new Date().toISOString(),
          isActive: true,
        },
      };
    });

    return res.json({
      success: true,
      data: {
        bots: botsWithOverrides,
        warnings,
        total: botsWithOverrides.length,
        legacyMode: botConfigManager.isLegacyMode(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    debug('Error getting bot configurations:', error);
    return res.status(500).json({
      error: 'Failed to get bot configurations',
      message: error.message || 'An error occurred while retrieving bot configurations',
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
          token: '',
          voiceChannelId: '',
        },
        openai: {
          apiKey: '',
          model: 'gpt-3.5-turbo',
        },
      },
    },
    slack_flowise: {
      name: 'Slack + Flowise Bot',
      description: 'A Slack bot using Flowise for AI responses',
      messageProvider: 'slack',
      llmProvider: 'flowise',
      config: {
        slack: {
          botToken: '',
          signingSecret: '',
          appToken: '',
        },
        flowise: {
          apiKey: '',
          endpoint: '',
        },
      },
    },
    mattermost_openwebui: {
      name: 'Mattermost + OpenWebUI Bot',
      description: 'A Mattermost bot using OpenWebUI for responses',
      messageProvider: 'mattermost',
      llmProvider: 'openwebui',
      config: {
        mattermost: {
          serverUrl: '',
          token: '',
        },
        openwebui: {
          apiKey: '',
          endpoint: '',
        },
      },
    },
  };

  return res.json({
    success: true,
    data: { templates },
  });
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
        message: `Bot configuration with ID ${botId} not found`,
      });
    }

    const overrides = userConfigStore.getBotOverride(bot.name);

    return res.json({
      success: true,
      data: {
        bot: {
          ...bot,
          overrides: overrides || {},
          metadata: {
            source: overrides ? 'user_override' : 'default',
            lastModified: overrides?.updatedAt || new Date().toISOString(),
            isActive: true,
          },
        },
      },
    });
  } catch (error: any) {
    debug('Error getting bot configuration:', error);
    return res.status(500).json({
      error: 'Failed to get bot configuration',
      message: error.message || 'An error occurred while retrieving bot configuration',
    });
  }
});

/**
 * POST /webui/api/bot-config
 * Create a new bot configuration (admin only)
 */
router.post(
  '/',
  requireAdmin,
  validateBotConfigCreation,
  sanitizeBotConfig,
  async (req: AuditedRequest, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const configData = req.body;
      const createdBy = authReq.user?.username || 'unknown';

      // Use BotConfigService to create the configuration
      const botConfigService = BotConfigService.getInstance();
      const newBot = await botConfigService.createBotConfig(configData, createdBy);

      logConfigChange(
        req,
        'CREATE',
        newBot.name,
        'success',
        'Bot configuration created successfully',
        {
          newValue: newBot,
        }
      );

      return res.status(201).json({
        success: true,
        data: { bot: newBot },
        message: 'Bot configuration created successfully',
      });
    } catch (error: any) {
      if (error instanceof ConfigurationError) {
        debug('Database not configured for bot configuration creation');
        logConfigChange(req, 'CREATE', req.body?.name || 'unknown', 'failure', error.message);
        return res.status(503).json({
          error: 'Database not configured',
          message: error.message,
        });
      }
      debug('Error creating bot configuration:', error);
      logConfigChange(
        req,
        'CREATE',
        req.body?.name || 'unknown',
        'failure',
        `Failed to create bot configuration: ${error.message}`
      );
      return res.status(400).json({
        error: 'Failed to create bot configuration',
        message: error.message || 'An error occurred while creating bot configuration',
      });
    }
  }
);

/**
 * PUT /webui/api/bot-config/:botId
 * Update an existing bot configuration (admin only)
 */
router.put(
  '/:botId',
  requireAdmin,
  validateBotConfigUpdate,
  sanitizeBotConfig,
  async (req: AuditedRequest, res: Response) => {
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
          message: `Bot configuration with ID ${botId} not found`,
        });
      }

      // Validate updated configuration using convict schema
      const schemaValidationResult = configValidator.validateBotConfigWithSchema({
        ...existingBot,
        ...updates,
      });
      if (!schemaValidationResult.isValid) {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          `Schema validation failed: ${schemaValidationResult.errors.join(', ')}`
        );
        return res.status(400).json({
          error: 'Schema validation error',
          message: 'Configuration schema validation failed',
          details: schemaValidationResult.errors,
        });
      }

      // Additional business logic validation
      const businessValidationResult = configValidator.validateBotConfig({
        ...existingBot,
        ...updates,
      });
      if (!businessValidationResult.isValid) {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          `Business validation failed: ${businessValidationResult.errors.join(', ')}`
        );
        return res.status(400).json({
          error: 'Business validation error',
          message: 'Configuration business validation failed',
          details: businessValidationResult.errors,
          warnings: businessValidationResult.warnings,
          suggestions: businessValidationResult.suggestions,
        });
      }

      const dbManager = DatabaseManager.getInstance();
      if (!dbManager.isConnected()) {
        return res.status(503).json({ error: 'Database not connected' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Create approval request for the configuration change
      const diff = JSON.stringify({
        old: existingBot,
        new: { ...existingBot, ...updates },
      });

      const approvalRequestId = await dbManager.createApprovalRequest({
        resourceType: 'BotConfiguration',
        resourceId: parseInt(botId),
        changeType: 'UPDATE',
        requestedBy: req.user?.username || 'unknown',
        diff,
        status: 'pending',
      });

      logConfigChange(
        req,
        'UPDATE',
        botId,
        'success',
        'Bot configuration update submitted for approval',
        {
          oldValue: existingBot,
          newValue: { ...existingBot, ...updates },
        }
      );

      return res.json({
        success: true,
        message: 'Bot configuration update requires approval.',
        approvalRequestId,
      });
    } catch (error: any) {
      if (error instanceof ConfigurationError) {
        debug('Database not configured for bot configuration update');
        logConfigChange(req, 'UPDATE', req.params.botId, 'failure', error.message);
        return res.status(503).json({
          error: 'Database not configured',
          message: error.message,
        });
      }
      debug('Error updating bot configuration:', error);
      logConfigChange(
        req,
        'UPDATE',
        req.params.botId,
        'failure',
        `Failed to update bot configuration: ${error.message}`
      );
      return res.status(400).json({
        error: 'Failed to update bot configuration',
        message: error.message || 'An error occurred while updating bot configuration',
      });
    }
  }
);

router.post(
  '/:botId/apply-update',
  requireRole('admin'),
  async (req: AuditedRequest, res: Response) => {
    const { botId } = req.params;
    const { approvalId } = req.body;

    try {
      const dbManager = DatabaseManager.getInstance();
      if (!dbManager.isConnected()) {
        return res.status(503).json({ error: 'Database not connected' });
      }

      // Validate approval request
      const approvalRequest = await dbManager.getApprovalRequest(approvalId);
      if (!approvalRequest) {
        logConfigChange(req, 'UPDATE', botId, 'failure', 'Approval request not found');
        return res.status(400).json({
          success: false,
          message: 'Approval request not found',
        });
      }

      if (approvalRequest.status !== 'approved') {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          `Approval request not approved (status: ${approvalRequest.status})`
        );
        return res.status(400).json({
          success: false,
          message: 'Approval request has not been approved',
        });
      }

      if (
        approvalRequest.resourceType !== 'BotConfiguration' ||
        approvalRequest.resourceId !== parseInt(botId)
      ) {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          'Approval request does not match this bot configuration'
        );
        return res.status(400).json({
          success: false,
          message: 'Invalid approval request for this bot configuration',
        });
      }

      // Extract updates from approval request diff
      let updates: any = {};
      if (approvalRequest.diff) {
        try {
          const diff = JSON.parse(approvalRequest.diff);
          updates = diff.new || {};
        } catch (error) {
          debug('Error parsing approval request diff:', error);
          logConfigChange(req, 'UPDATE', botId, 'failure', 'Failed to parse approval request diff');
          return res.status(400).json({
            error: 'Invalid approval request diff format',
            message: 'Could not parse the configuration changes from the approval request',
          });
        }
      }

      // Get existing bot configuration
      const existingBot = botConfigManager.getBot(botId);
      if (!existingBot) {
        logConfigChange(req, 'UPDATE', botId, 'failure', 'Bot configuration not found');
        return res.status(404).json({
          error: 'Bot configuration not found',
          message: `Bot configuration with ID ${botId} not found`,
        });
      }

      // Create merged configuration
      const updatedConfig = { ...existingBot, ...updates };

      // Update user overrides with the approved changes
      userConfigStore.setBotOverride(botId, {
        messageProvider: updatedConfig.messageProvider || existingBot.messageProvider,
        llmProvider: updatedConfig.llmProvider || existingBot.llmProvider,
        persona: updatedConfig.persona || existingBot.persona,
        systemInstruction: updatedConfig.systemInstruction || existingBot.systemInstruction,
        mcpServers: updatedConfig.mcpServers || existingBot.mcpServers,
        mcpGuard: updatedConfig.mcpGuard || existingBot.mcpGuard,
      });

      // Update secure config if sensitive data changed
      const hasSensitiveChanges =
        updatedConfig.discord?.token ||
        updatedConfig.slack?.botToken ||
        updatedConfig.openai?.apiKey ||
        updatedConfig.flowise?.apiKey;

      if (hasSensitiveChanges) {
        await secureConfigManager.storeConfig({
          id: botId,
          name: updatedConfig.name || existingBot.name,
          type: 'bot',
          data: {
            discord: updatedConfig.discord || {},
            slack: updatedConfig.slack || {},
            openai: updatedConfig.openai || {},
            flowise: updatedConfig.flowise || {},
            openwebui: updatedConfig.openwebui || {},
          },
          createdAt: new Date().toISOString(),
        });
      }

      // Reload configuration to pick up changes
      botConfigManager.reload();

      // Get updated bot configuration
      const updatedBot = botConfigManager.getBot(botId);
      if (!updatedBot) {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          'Bot configuration not found after update'
        );
        return res.status(500).json({
          error: 'Failed to update bot configuration',
          message: 'Bot configuration was not found after update',
        });
      }

      // Update the approval request to mark it as applied
      await dbManager.updateApprovalRequest(approvalId, {
        status: 'approved',
        reviewedBy: req.user?.username,
        reviewedAt: new Date(),
        reviewComments: 'Applied successfully',
      });

      logConfigChange(
        req,
        'UPDATE',
        botId,
        'success',
        'Bot configuration updated successfully via approval workflow',
        {
          oldValue: existingBot,
          newValue: updatedBot,
        }
      );

      return res.json({
        success: true,
        data: { bot: updatedBot },
        message: 'Bot configuration updated successfully',
      });
    } catch (error: any) {
      debug('Error applying bot configuration update:', error);
      logConfigChange(
        req,
        'UPDATE',
        botId,
        'failure',
        `Failed to apply bot configuration update: ${error.message}`
      );
      return res.status(400).json({
        error: 'Failed to apply bot configuration update',
        message: error.message || 'An error occurred while applying bot configuration update',
      });
    }
  }
);

export default router;
