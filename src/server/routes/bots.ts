import { Router, Request, Response } from 'express';
import { BotManager, CreateBotRequest } from '../../managers/BotManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AuthMiddlewareRequest } from '../../auth/types';
import Debug from 'debug';
import { auditMiddleware, AuditedRequest, logBotAction } from '../middleware/audit';
import { ActivityLogger } from '../services/ActivityLogger';

const debug = Debug('app:BotsRoutes');
const router = Router();
const botManager = BotManager.getInstance();
const activityLogger = ActivityLogger.getInstance();

// Apply audit middleware after authentication
router.use(authenticate, auditMiddleware);

/**
 * GET /webui/api/bots
 * Get all bot instances
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const bots = await botManager.getAllBots();

    res.json({
      success: true,
      data: { bots },
      total: bots.length
    });
  } catch (error: any) {
    debug('Error getting bots:', error);
    res.status(500).json({
      error: 'Failed to get bots',
      message: error.message || 'An error occurred while retrieving bots'
    });
  }
});

/**
 * GET /webui/api/bots/:botId
 * Get a specific bot instance
 */
router.get('/:botId', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const bot = await botManager.getBot(botId);

    if (!bot) {
      return res.status(404).json({
        error: 'Bot not found',
        message: `Bot with ID ${botId} not found`
      });
    }

    res.json({
      success: true,
      data: { bot }
    });
  } catch (error: any) {
    debug('Error getting bot:', error);
    res.status(500).json({
      error: 'Failed to get bot',
      message: error.message || 'An error occurred while retrieving bot'
    });
  }
});

/**
 * POST /webui/api/bots
 * Create a new bot instance (admin only)
 */
router.post('/', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const createRequest: CreateBotRequest = req.body;

    // Validate required fields
    if (!createRequest.name || !createRequest.messageProvider || !createRequest.llmProvider) {
      logBotAction(req, 'CREATE', createRequest.name || 'unknown', 'failure', 'Missing required fields: name, messageProvider, llmProvider');
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, messageProvider, and llmProvider are required'
      });
    }

    const bot = await botManager.createBot(createRequest);

    logBotAction(req, 'CREATE', bot.name, 'success', `Created bot with message provider ${bot.messageProvider} and LLM provider ${bot.llmProvider}`, {
      newValue: bot
    });

    res.status(201).json({
      success: true,
      data: { bot },
      message: 'Bot created successfully'
    });
  } catch (error: any) {
    debug('Error creating bot:', error);
    logBotAction(req, 'CREATE', req.body?.name || 'unknown', 'failure', `Failed to create bot: ${error.message}`);
    res.status(400).json({
      error: 'Failed to create bot',
      message: error.message || 'An error occurred while creating bot'
    });
  }
});

/**
 * POST /webui/api/bots/:botId/clone
 * Clone an existing bot instance (admin only)
 */
router.post('/:botId/clone', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const { newName } = req.body;

    if (!newName || newName.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New bot name is required'
      });
    }

    const clonedBot = await botManager.cloneBot(botId, newName);

    res.status(201).json({
      success: true,
      data: { bot: clonedBot },
      message: 'Bot cloned successfully'
    });
  } catch (error: any) {
    debug('Error cloning bot:', error);
    res.status(400).json({
      error: 'Failed to clone bot',
      message: error.message || 'An error occurred while cloning bot'
    });
  }
});

/**
 * PUT /webui/api/bots/:botId
 * Update an existing bot instance (admin only)
 */
router.put('/:botId', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const updates = req.body;

    // Get the bot before update for audit logging
    const existingBot = await botManager.getBot(botId);

    const updatedBot = await botManager.updateBot(botId, updates);

    logBotAction(req, 'UPDATE', botId, 'success', `Updated bot configuration`, {
      oldValue: existingBot,
      newValue: updatedBot
    });

    res.json({
      success: true,
      data: { bot: updatedBot },
      message: 'Bot updated successfully'
    });
  } catch (error: any) {
    debug('Error updating bot:', error);
    logBotAction(req, 'UPDATE', req.params.botId, 'failure', `Failed to update bot: ${error.message}`);
    res.status(400).json({
      error: 'Failed to update bot',
      message: error.message || 'An error occurred while updating bot'
    });
  }
});

/**
 * DELETE /webui/api/bots/:botId
 * Delete a bot instance (admin only)
 */
router.delete('/:botId', requireAdmin, async (req: AuditedRequest, res: Response) => {
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
        message: `Bot with ID ${botId} not found`
      });
    }

    logBotAction(req, 'DELETE', botId, 'success', `Deleted bot ${botToDelete?.name || botId}`, {
      oldValue: botToDelete
    });

    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error: any) {
    debug('Error deleting bot:', error);
    logBotAction(req, 'DELETE', req.params.botId, 'failure', `Failed to delete bot: ${error.message}`);
    res.status(500).json({
      error: 'Failed to delete bot',
      message: error.message || 'An error occurred while deleting bot'
    });
  }
});

/**
 * POST /webui/api/bots/:botId/start
 * Start a bot instance (admin only)
 */
router.post('/:botId/start', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;

    const started = await botManager.startBot(botId);

    if (!started) {
      return res.status(404).json({
        error: 'Bot not found',
        message: `Bot with ID ${botId} not found`
      });
    }

    res.json({
      success: true,
      message: 'Bot started successfully'
    });
  } catch (error: any) {
    debug('Error starting bot:', error);
    res.status(500).json({
      error: 'Failed to start bot',
      message: error.message || 'An error occurred while starting bot'
    });
  }
});

/**
 * POST /webui/api/bots/:botId/stop
 * Stop a bot instance (admin only)
 */
router.post('/:botId/stop', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;

    const stopped = await botManager.stopBot(botId);

    if (!stopped) {
      return res.status(404).json({
        error: 'Bot not found',
        message: `Bot with ID ${botId} not found`
      });
    }

    res.json({
      success: true,
      message: 'Bot stopped successfully'
    });
  } catch (error: any) {
    debug('Error stopping bot:', error);
    res.status(500).json({
      error: 'Failed to stop bot',
      message: error.message || 'An error occurred while stopping bot'
    });
  }
});

/**
 * GET /webui/api/bots/templates
 * Get bot configuration templates
 */
router.get('/templates', authenticate, (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  const templates = {
    discord: {
      name: 'Discord Bot',
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
    slack: {
      name: 'Slack Bot',
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
    mattermost: {
      name: 'Mattermost Bot',
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

/**
 * GET /webui/api/bots/:botId/activity
 * Get activity logs for a specific bot
 */
router.get('/:botId/activity', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { botId } = req.params;
    const { limit = '50', startTime, endTime } = req.query;

    const options: any = {
      limit: parseInt(limit as string, 10),
      botName: botId
    };

    if (startTime) {
      options.startTime = new Date(startTime as string);
    }
    if (endTime) {
      options.endTime = new Date(endTime as string);
    }

    const events = await activityLogger.getEvents(options);

    res.json({
      success: true,
      data: {
        botId,
        events,
        total: events.length
      }
    });
  } catch (error: any) {
    debug('Error getting bot activity:', error);
    res.status(500).json({
      error: 'Failed to get bot activity',
      message: error.message || 'An error occurred while retrieving bot activity'
    });
  }
});

/**
 * GET /webui/api/bots/activity/summary
 * Get activity summary for all bots
 */
router.get('/activity/summary', authenticate, async (req: Request, res: Response) => {
  const authReq = req as AuthMiddlewareRequest;
  try {
    const { limit = '100' } = req.query;

    const events = await activityLogger.getEvents({
      limit: parseInt(limit as string, 10)
    });

    // Aggregate activity by bot
    const botActivity: Record<string, {
      name: string;
      totalEvents: number;
      successCount: number;
      errorCount: number;
      lastActivity: string | null;
      messageCount: number;
    }> = {};

    for (const event of events) {
      const botName = event.botName || 'unknown';
      if (!botActivity[botName]) {
        botActivity[botName] = {
          name: botName,
          totalEvents: 0,
          successCount: 0,
          errorCount: 0,
          lastActivity: null,
          messageCount: 0
        };
      }

      botActivity[botName].totalEvents++;
      if (event.status === 'error') {
        botActivity[botName].errorCount++;
      } else {
        botActivity[botName].successCount++;
      }
      if (event.messageType === 'outgoing') {
        botActivity[botName].messageCount++;
      }
      if (!botActivity[botName].lastActivity || new Date(event.timestamp) > new Date(botActivity[botName].lastActivity)) {
        botActivity[botName].lastActivity = event.timestamp;
      }
    }

    res.json({
      success: true,
      data: {
        summary: Object.values(botActivity),
        totalEvents: events.length
      }
    });
  } catch (error: any) {
    debug('Error getting activity summary:', error);
    res.status(500).json({
      error: 'Failed to get activity summary',
      message: error.message || 'An error occurred while retrieving activity summary'
    });
  }
});

export default router;
