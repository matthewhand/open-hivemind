import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AuthMiddlewareRequest } from '../../auth/types';
import Debug from 'debug';
import { auditMiddleware, AuditedRequest, logConfigChange } from '../middleware/audit';
import { BotConfigurationManager, BotConfig } from '../../config/BotConfigurationManager';
import { SecureConfigManager } from '../../config/SecureConfigManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ConfigurationValidator } from '../../webui/services/ConfigurationValidator';

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
router.post('/', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const configData = req.body;

    // Validate configuration using convict schema
    const schemaValidationResult = configValidator.validateBotConfigWithSchema(configData);
    if (!schemaValidationResult.isValid) {
      logConfigChange(req, 'CREATE', configData.name || 'unknown', 'failure', `Schema validation failed: ${schemaValidationResult.errors.join(', ')}`);
      return res.status(400).json({
        error: 'Schema validation error',
        message: 'Configuration schema validation failed',
        details: schemaValidationResult.errors
      });
    }

    // Additional business logic validation
    const businessValidationResult = configValidator.validateBotConfig(configData);
    if (!businessValidationResult.isValid) {
      logConfigChange(req, 'CREATE', configData.name || 'unknown', 'failure', `Business validation failed: ${businessValidationResult.errors.join(', ')}`);
      return res.status(400).json({
        error: 'Business validation error',
        message: 'Configuration business validation failed',
        details: businessValidationResult.errors,
        warnings: businessValidationResult.warnings,
        suggestions: businessValidationResult.suggestions
      });
    }

    // Check if bot name already exists
    const existingBots = botConfigManager.getAllBots();
    if (existingBots.some(bot => bot.name === configData.name)) {
      logConfigChange(req, 'CREATE', configData.name, 'failure', 'Bot name already exists');
      return res.status(409).json({
        error: 'Conflict',
        message: 'Bot configuration with this name already exists'
      });
    }

    // Store in secure config if sensitive data is present
    if (configData.discord?.token || configData.slack?.botToken || configData.openai?.apiKey) {
      await secureConfigManager.storeConfig({
        id: configData.name,
        name: configData.name,
        type: 'bot',
        data: {
          discord: configData.discord,
          slack: configData.slack,
          openai: configData.openai,
          flowise: configData.flowise,
          openwebui: configData.openwebui
        },
        createdAt: new Date().toISOString()
      });
    }

    // Create user override to "create" the bot configuration
    userConfigStore.setBotOverride(configData.name, {
      messageProvider: configData.messageProvider,
      llmProvider: configData.llmProvider,
      persona: configData.persona,
      systemInstruction: configData.systemInstruction,
      mcpServers: configData.mcpServers,
      mcpGuard: configData.mcpGuard
    });

    // Reload configuration to pick up the new bot
    botConfigManager.reload();

    // Get the newly created bot
    const newBot = botConfigManager.getBot(configData.name);

    if (!newBot) {
      logConfigChange(req, 'CREATE', configData.name, 'failure', 'Failed to create bot configuration - bot not found after creation');
      return res.status(500).json({
        error: 'Failed to create bot configuration',
        message: 'Bot configuration was not found after creation'
      });
    }

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

    // Update user overrides
    userConfigStore.setBotOverride(botId, {
      messageProvider: updates.messageProvider || existingBot.messageProvider,
      llmProvider: updates.llmProvider || existingBot.llmProvider,
      persona: updates.persona !== undefined ? updates.persona : existingBot.persona,
      systemInstruction: updates.systemInstruction !== undefined ? updates.systemInstruction : existingBot.systemInstruction,
      mcpServers: updates.mcpServers !== undefined ? updates.mcpServers : existingBot.mcpServers,
      mcpGuard: updates.mcpGuard !== undefined ? updates.mcpGuard : existingBot.mcpGuard
    });

    // Update secure config if sensitive data changed
    if (updates.discord || updates.slack || updates.openai || updates.flowise || updates.openwebui) {
      await secureConfigManager.storeConfig({
        id: botId,
        name: botId,
        type: 'bot',
        data: {
          discord: updates.discord || existingBot.discord,
          slack: updates.slack || existingBot.slack,
          openai: updates.openai || existingBot.openai,
          flowise: updates.flowise || existingBot.flowise,
          openwebui: updates.openwebui || existingBot.openwebui
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
      oldValue: existingBot,
      newValue: updatedBot
    });

    res.json({
      success: true,
      data: { bot: updatedBot },
      message: 'Bot configuration updated successfully'
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