import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin, requireRole } from '../../auth/middleware';
import { type AuthMiddlewareRequest } from '../../auth/types';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import { DatabaseManager } from '../../database/DatabaseManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { configLimiter } from '../../middleware/rateLimiter';
import { HTTP_STATUS } from '../../types/constants';
import { ConfigurationError } from '../../types/errorClasses';
import { ErrorUtils } from '../../types/errors';
import { BotApplyUpdateSchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../middleware/audit';
import {
  sanitizeBotConfig,
  validateBotConfigCreation,
  validateBotConfigUpdate,
} from '../middleware/formValidation';
import { BotConfigService } from '../services/BotConfigService';
import { ConfigurationValidator } from '../services/ConfigurationValidator';
import { ApiResponse } from '../utils/apiResponse';

const debug = Debug('app:BotConfigRoutes');
const router = Router();
const botConfigManager = BotConfigurationManager.getInstance();
const secureConfigManager = SecureConfigManager.getInstanceSync();
const userConfigStore = UserConfigStore.getInstance();
const dbManager = DatabaseManager.getInstance();
const configValidator = new ConfigurationValidator();

// Apply authentication and audit middleware
router.use(authenticate, auditMiddleware);

/**
 * GET /webui/api/bot-config
 * Get all bot configurations with full details
 */
router.get(
  '/',
  asyncErrorHandler(async (req, res) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const botConfigService = BotConfigService.getInstance();
      const bots = await botConfigService.getAllBotConfigs();
      const warnings = botConfigManager.getWarnings();

      // Get all user overrides at once to avoid N+1 queries
      const allOverrides = userConfigStore.getAllBotOverrides();

      // Apply user overrides for each bot
      const botsWithOverrides = bots.map((bot) => {
        const overrides = allOverrides.get(bot.name);
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

      return res.json(
        ApiResponse.success({
          bots: botsWithOverrides,
          warnings,
          total: botsWithOverrides.length,
          legacyMode: botConfigManager.isLegacyMode(),
        })
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorMessage = ErrorUtils.getMessage(hivemindError);
      debug('Error getting bot configurations:', hivemindError);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to get bot configurations', undefined, 500));
    }
  })
);

/**
 * GET /webui/api/bot-config/templates
 * Get bot configuration templates
 */
router.get(
  '/templates',
  asyncErrorHandler(async (req, res) => {
    try {
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

      res.json(ApiResponse.success(templates));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error fetching templates:', hivemindError);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to fetch templates', undefined, 500));
    }
  })
);

/**
 * GET /webui/api/bot-config/:botId
 * Get a specific bot configuration
 */
router.get(
  '/:botId',
  asyncErrorHandler(async (req, res) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;
      const bot = botConfigManager.getBot(botId);

      if (!bot) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Bot configuration not found', undefined, 404));
      }

      const overrides = userConfigStore.getBotOverride(bot.name);

      return res.json(
        ApiResponse.success({
          bot: {
            ...bot,
            overrides: overrides || {},
            metadata: {
              source: overrides ? 'user_override' : 'default',
              lastModified: overrides?.updatedAt || new Date().toISOString(),
              isActive: true,
            },
          },
        })
      );
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorMessage = ErrorUtils.getMessage(hivemindError);
      debug('Error getting bot configuration:', hivemindError);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to get bot configuration', undefined, 500));
    }
  })
);

/**
 * POST /webui/api/bot-config
 * Create a new bot configuration (admin only)
 */
router.post(
  '/',
  configLimiter,
  requireAdmin,
  validateBotConfigCreation,
  sanitizeBotConfig,
  asyncErrorHandler(async (req, res) => {
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

      return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ bot: newBot }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorMessage = ErrorUtils.getMessage(hivemindError);
      if (error instanceof ConfigurationError) {
        debug('Database not configured for bot configuration creation');
        logConfigChange(req, 'CREATE', req.body?.name || 'unknown', 'failure', errorMessage);
        return res
          .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .json(ApiResponse.error('Database not configured', undefined, 503));
      }
      debug('Error creating bot configuration:', hivemindError);
      logConfigChange(
        req,
        'CREATE',
        req.body?.name || 'unknown',
        'failure',
        `Failed to create bot configuration: ${errorMessage}`
      );
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Failed to create bot configuration', undefined, 400));
    }
  })
);

/**
 * PUT /webui/api/bot-config/:botId
 * Update an existing bot configuration (admin only)
 */
router.put(
  '/:botId',
  configLimiter,
  requireAdmin,
  validateBotConfigUpdate,
  sanitizeBotConfig,
  asyncErrorHandler(async (req, res) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;
      const updates = req.body;

      // Get existing bot for comparison
      const existingBot = botConfigManager.getBot(botId);
      if (!existingBot) {
        logConfigChange(req, 'UPDATE', botId, 'failure', 'Bot configuration not found');
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Bot configuration not found', undefined, 404));
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
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Schema validation error', undefined, 400));
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
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Business validation error', undefined, 400));
      }

      const dbManager = DatabaseManager.getInstance();
      if (!dbManager.isConnected()) {
        return res
          .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .json(ApiResponse.error('Database not connected', undefined, 503));
      }

      if (!req.user) {
        return res
          .status(HTTP_STATUS.UNAUTHORIZED)
          .json(ApiResponse.error('User not authenticated', undefined, 401));
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

      return res.json(ApiResponse.success({ approvalRequestId }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorMessage = ErrorUtils.getMessage(hivemindError);
      if (error instanceof ConfigurationError) {
        debug('Database not configured for bot configuration update');
        logConfigChange(req, 'UPDATE', req.params.botId, 'failure', errorMessage);
        return res
          .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .json(ApiResponse.error('Database not configured', undefined, 503));
      }
      debug('Error updating bot configuration:', hivemindError);
      logConfigChange(
        req,
        'UPDATE',
        req.params.botId,
        'failure',
        `Failed to update bot configuration: ${errorMessage}`
      );
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Failed to update bot configuration', undefined, 400));
    }
  })
);

router.post(
  '/:botId/apply-update',
  configLimiter,
  requireRole('admin'),
  validateRequest(BotApplyUpdateSchema),
  asyncErrorHandler(async (req, res) => {
    const { botId } = req.params;
    const { approvalId } = req.body;

    try {
      const dbManager = DatabaseManager.getInstance();
      if (!dbManager.isConnected()) {
        return res
          .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .json(ApiResponse.error('Database not connected', undefined, 503));
      }

      // Validate approval request
      const approvalRequest = await dbManager.getApprovalRequest(approvalId);
      if (!approvalRequest) {
        logConfigChange(req, 'UPDATE', botId, 'failure', 'Approval request not found');
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Approval request not found', undefined, 400));
      }

      if (approvalRequest.status !== 'approved') {
        logConfigChange(
          req,
          'UPDATE',
          botId,
          'failure',
          `Approval request not approved (status: ${approvalRequest.status})`
        );
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(ApiResponse.error('Approval request has not been approved', undefined, 400));
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
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            ApiResponse.error('Invalid approval request for this bot configuration', undefined, 400)
          );
      }

      // Extract updates from approval request diff
      let updates: any = {};
      if (approvalRequest.diff) {
        try {
          const diff = JSON.parse(approvalRequest.diff);
          updates = diff.new || {};
        } catch (error: unknown) {
          const hivemindError = ErrorUtils.toHivemindError(error);
          debug('Error parsing approval request diff:', hivemindError);
          logConfigChange(req, 'UPDATE', botId, 'failure', 'Failed to parse approval request diff');
          return res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(ApiResponse.error('Invalid approval request diff format', undefined, 400));
        }
      }

      // Get existing bot configuration
      const existingBot = botConfigManager.getBot(botId);
      if (!existingBot) {
        logConfigChange(req, 'UPDATE', botId, 'failure', 'Bot configuration not found');
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Bot configuration not found', undefined, 404));
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
          data: {
            discord: updatedConfig.discord || {},
            slack: updatedConfig.slack || {},
            openai: updatedConfig.openai || {},
            flowise: updatedConfig.flowise || {},
            openwebui: updatedConfig.openwebui || {},
          },
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
        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .json(ApiResponse.error('Failed to update bot configuration', undefined, 500));
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

      return res.json(ApiResponse.success({ bot: updatedBot }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorMessage = ErrorUtils.getMessage(hivemindError);
      debug('Error applying bot configuration update:', hivemindError);
      logConfigChange(
        req,
        'UPDATE',
        botId,
        'failure',
        `Failed to apply bot configuration update: ${errorMessage}`
      );
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Failed to apply bot configuration update', undefined, 400));
    }
  })
);

export default router;
