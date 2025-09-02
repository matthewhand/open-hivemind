import { Router, Request, Response } from 'express';
import { BotManager, CreateBotRequest } from '../../managers/BotManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AuthMiddlewareRequest } from '../../auth/types';
import Debug from 'debug';

const debug = Debug('app:BotsRoutes');
const router = Router();
const botManager = BotManager.getInstance();

/**
 * GET /webui/api/bots
 * Get all bot instances
 */
router.get('/', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
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
router.get('/:botId', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
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
router.post('/', authenticate, requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const createRequest: CreateBotRequest = req.body;

    // Validate required fields
    if (!createRequest.name || !createRequest.messageProvider || !createRequest.llmProvider) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, messageProvider, and llmProvider are required'
      });
    }

    const bot = await botManager.createBot(createRequest);

    res.status(201).json({
      success: true,
      data: { bot },
      message: 'Bot created successfully'
    });
  } catch (error: any) {
    debug('Error creating bot:', error);
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
router.post('/:botId/clone', authenticate, requireAdmin, async (req: AuthMiddlewareRequest, res: Response) => {
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
router.put('/:botId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { botId } = req.params;
    const updates = req.body;

    const updatedBot = await botManager.updateBot(botId, updates);

    res.json({
      success: true,
      data: { bot: updatedBot },
      message: 'Bot updated successfully'
    });
  } catch (error: any) {
    debug('Error updating bot:', error);
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
router.delete('/:botId', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { botId } = req.params;

    const deleted = await botManager.deleteBot(botId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Bot not found',
        message: `Bot with ID ${botId} not found`
      });
    }

    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error: any) {
    debug('Error deleting bot:', error);
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
router.post('/:botId/start', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.post('/:botId/stop', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
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
router.get('/templates', authenticate, (req: AuthenticatedRequest, res: Response) => {
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

export default router;
