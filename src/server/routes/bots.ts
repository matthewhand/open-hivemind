import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { AuditLogger } from '@src/common/auditLogger';
import WebSocketService from '@src/server/services/WebSocketService';
import {
  BotIdParamSchema,
  CloneBotSchema,
  CreateBotSchema,
  UpdateBotSchema,
} from '@src/validation/schemas/botSchema';
import { validateRequest } from '@src/validation/validateRequest';
import type { AuthMiddlewareRequest } from '../../auth/types';
import { BotManager, type CreateBotRequest } from '../../managers/BotManager';
import { auditMiddleware, logBotAction, type AuditedRequest } from '../middleware/audit';
import { authenticateToken } from '../middleware/auth';

const debug = Debug('app:BotsRoutes');
const router = Router();
const botManager = BotManager.getInstance();

// Apply authentication and audit middleware
router.use(authenticateToken);
router.use(auditMiddleware);

/**
 * GET /webui/api/bots
 * Get all bot instances
 */
router.get('/', async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const bots = await botManager.getAllBots();

    return res.json({
      success: true,
      data: { bots },
      total: bots.length,
    });
  } catch (error: any) {
    debug('Error getting bots:', error);
    return res.status(500).json({
      error: 'Failed to get bots',
      message: error.message || 'An error occurred while retrieving bots',
    });
  }
});

/**
 * GET /webui/api/bots/:botId
 * Get a specific bot instance
 */
router.get('/:botId', validateRequest(BotIdParamSchema), async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const bot = await botManager.getBot(botId);

    if (!bot) {
      return res.status(404).json({
        error: 'Bot not found',
        message: `Bot with ID ${botId} not found`,
      });
    }

    return res.json({
      success: true,
      data: { bot },
    });
  } catch (error: any) {
    debug('Error getting bot:', error);
    return res.status(500).json({
      error: 'Failed to get bot',
      message: error.message || 'An error occurred while retrieving bot',
    });
  }
});

/**
 * POST /webui/api/bots
 * Create a new bot instance (admin only)
 */
router.post('/', validateRequest(CreateBotSchema), async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const createRequest: CreateBotRequest = req.body;

    const bot = await botManager.createBot(createRequest);

    logBotAction(
      req,
      'CREATE',
      bot.name,
      'success',
      `Created bot with message provider ${bot.messageProvider} and LLM provider ${bot.llmProvider}`,
      {
        newValue: bot,
      }
    );

    return res.status(201).json({
      success: true,
      data: { bot },
      message: 'Bot created successfully',
    });
  } catch (error: any) {
    debug('Error creating bot:', error);
    logBotAction(
      req,
      'CREATE',
      req.body?.name || 'unknown',
      'failure',
      `Failed to create bot: ${error.message}`
    );
    return res.status(400).json({
      error: 'Failed to create bot',
      message: error.message || 'An error occurred while creating bot',
    });
  }
});

/**
 * POST /webui/api/bots/:botId/clone
 * Clone an existing bot instance (admin only)
 */
router.post(
  '/:botId/clone',
  validateRequest(BotIdParamSchema.merge(CloneBotSchema)),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId, newName } = req.body;

      const clonedBot = await botManager.cloneBot(botId, newName);

      return res.status(201).json({
        success: true,
        data: { bot: clonedBot },
        message: 'Bot cloned successfully',
      });
    } catch (error: any) {
      debug('Error cloning bot:', error);
      return res.status(400).json({
        error: 'Failed to clone bot',
        message: error.message || 'An error occurred while cloning bot',
      });
    }
  }
);

/**
 * PUT /webui/api/bots/:botId
 * Update an existing bot instance (admin only)
 */
router.put(
  '/:botId',
  validateRequest(BotIdParamSchema.merge(UpdateBotSchema)),
  async (req: AuditedRequest, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;
      const updates = req.body;

      // Get the bot before update for audit logging
      const existingBot = await botManager.getBot(botId);

      const updatedBot = await botManager.updateBot(botId, updates);

      logBotAction(req, 'UPDATE', botId, 'success', 'Updated bot configuration', {
        oldValue: existingBot,
        newValue: updatedBot,
      });

      return res.json({
        success: true,
        data: { bot: updatedBot },
        message: 'Bot updated successfully',
      });
    } catch (error: any) {
      debug('Error updating bot:', error);
      logBotAction(
        req,
        'UPDATE',
        req.params.botId,
        'failure',
        `Failed to update bot: ${error.message}`
      );
      return res.status(400).json({
        error: 'Failed to update bot',
        message: error.message || 'An error occurred while updating bot',
      });
    }
  }
);

/**
 * DELETE /webui/api/bots/:botId
 * Delete a bot instance (admin only)
 */
router.delete(
  '/:botId',
  validateRequest(BotIdParamSchema),
  async (req: AuditedRequest, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;

      // Get the bot before deletion for audit logging
      const botToDelete = await botManager.getBot(botId);

      const deleted = await botManager.deleteBot(botId);

      if (!deleted) {
        logBotAction(req, 'DELETE', botId, 'failure', 'Bot not found');
        return res.status(404).json({
          error: 'Bot not found',
          message: `Bot with ID ${botId} not found`,
        });
      }

      logBotAction(req, 'DELETE', botId, 'success', `Deleted bot ${botToDelete?.name || botId}`, {
        oldValue: botToDelete,
      });

      return res.json({
        success: true,
        message: 'Bot deleted successfully',
      });
    } catch (error: any) {
      debug('Error deleting bot:', error);
      logBotAction(
        req,
        'DELETE',
        req.params.botId,
        'failure',
        `Failed to delete bot: ${error.message}`
      );
      return res.status(500).json({
        error: 'Failed to delete bot',
        message: error.message || 'An error occurred while deleting bot',
      });
    }
  }
);

/**
 * POST /webui/api/bots/:botId/start
 * Start a bot instance (admin only)
 */
router.post(
  '/:botId/start',
  validateRequest(BotIdParamSchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;

      const started = await botManager.startBot(botId);

      if (!started) {
        return res.status(404).json({
          error: 'Bot not found',
          message: `Bot with ID ${botId} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'Bot started successfully',
      });
    } catch (error: any) {
      debug('Error starting bot:', error);
      return res.status(500).json({
        error: 'Failed to start bot',
        message: error.message || 'An error occurred while starting bot',
      });
    }
  }
);

/**
 * POST /webui/api/bots/:botId/stop
 * Stop a bot instance (admin only)
 */
router.post(
  '/:botId/stop',
  validateRequest(BotIdParamSchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;

      const stopped = await botManager.stopBot(botId);

      if (!stopped) {
        return res.status(404).json({
          error: 'Bot not found',
          message: `Bot with ID ${botId} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'Bot stopped successfully',
      });
    } catch (error: any) {
      debug('Error stopping bot:', error);
      return res.status(500).json({
        error: 'Failed to stop bot',
        message: error.message || 'An error occurred while stopping bot',
      });
    }
  }
);

/**
 * GET /webui/api/bots/:botId/activity
 * Get bot activity logs
 */
router.get(
  '/:botId/activity',
  validateRequest(BotIdParamSchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const auditLogger = AuditLogger.getInstance();
      const auditActivity = auditLogger.getBotActivity(botId, limit);

      // Fetch bot to get name for runtime filtering
      const bot = await botManager.getBot(botId);

      // Get runtime activity from WebSocketService
      const wsService = WebSocketService.getInstance();
      const runtimeActivity = wsService
        .getMessageFlow(1000) // Get last 1000 events to filter
        .filter((event) => {
          // loose matching on name or ID
          if (!bot) {
            return (event as any).botId === botId;
          }
          return event.botName === bot.name || (event as any).botId === botId;
        })
        .map((event) => ({
          id: event.id || `runtime_${Date.now()}_${Math.random()}`,
          timestamp: event.timestamp,
          action: event.messageType === 'incoming' ? 'MESSAGE_RECEIVED' : 'RESPONSE_SENT',
          result: event.status === 'error' || event.status === 'timeout' ? 'failure' : 'success',
          details:
            event.errorMessage ||
            (event.messageType === 'incoming' ? 'Message received' : 'Response sent'),
          user: 'System',
          resource: `bots/${botId}`,
          metadata: { type: 'RUNTIME', ...event },
        }));

      // Combine and sort
      const combinedActivity = [...auditActivity, ...runtimeActivity]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      return res.json({
        success: true,
        data: { activity: combinedActivity },
      });
    } catch (error: any) {
      debug('Error getting bot activity:', error);
      return res.status(500).json({
        error: 'Failed to get bot activity',
        message: error.message || 'An error occurred while getting bot activity',
      });
    }
  }
);

/**
 * GET /webui/api/bots/:botId/history
 * Get bot chat history
 */
router.get(
  '/:botId/history',
  validateRequest(BotIdParamSchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthMiddlewareRequest;
    try {
      const { botId } = req.params;
      const channelId = req.query.channelId as string; // Optional: specific channel
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await botManager.getBotHistory(botId, channelId, limit);

      return res.json({
        success: true,
        data: { history },
      });
    } catch (error: any) {
      debug('Error getting bot history:', error);
      return res.status(500).json({
        error: 'Failed to get bot history',
        message: error.message || 'An error occurred while getting bot history',
      });
    }
  }
);

/**
 * GET /webui/api/bots/templates
 * Get bot configuration templates
 */
router.get('/templates', (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  const templates = [
    {
      id: 'template_discord_community',
      name: 'Discord Community Bot',
      description:
        'A friendly bot for managing Discord communities with moderation and engagement features.',
      messageProvider: 'discord',
      persona: 'friendly-helper',
      llmProvider: 'openai',
      tags: ['community', 'moderation', 'discord'],
      featured: true,
      config: {
        discord: {
          token: '',
          voiceChannelId: '',
        },
        openai: {
          apiKey: '',
          model: 'gpt-4o',
        },
      },
    },
    {
      id: 'template_slack_assistant',
      name: 'Development Assistant',
      description:
        'Technical support bot for development teams with code review and documentation help.',
      messageProvider: 'slack',
      persona: 'dev-assistant',
      llmProvider: 'anthropic', // Note: Make sure 'anthropic' is a valid provider in your system or map to 'openwebui'
      tags: ['development', 'technical', 'code-review'],
      featured: true,
      config: {
        slack: {
          botToken: '',
          signingSecret: '',
        },
        openwebui: {
          apiKey: '',
          endpoint: 'https://api.anthropic.com',
        },
      },
    },
    {
      id: 'template_mattermost_tutor',
      name: 'Educational Tutor',
      description: 'Patient teaching assistant for educational environments and training programs.',
      messageProvider: 'mattermost',
      persona: 'teacher',
      llmProvider: 'openai',
      tags: ['education', 'teaching', 'training'],
      featured: false,
      config: {
        mattermost: {
          serverUrl: '',
          token: '',
        },
        openai: {
          apiKey: '',
        },
      },
    },
  ];

  return res.json({
    success: true,
    data: { templates },
  });
});

export default router;
