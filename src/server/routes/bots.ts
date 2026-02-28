import { Router } from 'express';
import { BotManager, type CreateBotRequest } from '../../managers/BotManager';
import { ActivityLogger } from '../services/ActivityLogger';
import { WebSocketService } from '../services/WebSocketService';
import { requireRole } from '../middleware/auth';

const router = Router();
const manager = BotManager.getInstance();
const wsService = WebSocketService.getInstance();

// GET /api/bots - List all bots with status
router.get('/', async (req, res) => {
  try {
    const bots = await manager.getAllBots();
    const statuses = await manager.getBotsStatus();
    const statusMap = new Map(statuses.map((s) => [s.id, s.isRunning]));

    const result = bots.map((bot) => {
      // WebSocketService tracks metrics by bot name, not ID
      const stats = wsService.getBotStats(bot.name) || {
        messageCount: 0,
        errors: [],
        errorCount: 0,
      };
      return {
        id: bot.id,
        name: bot.name,
        provider: bot.messageProvider,
        messageProvider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        persona: bot.persona,
        status: bot.isActive ? 'active' : 'disabled',
        connected: statusMap.get(bot.id) || false,
        messageCount: stats.messageCount,
        errorCount: stats.errorCount,
        // Note: config and envOverrides intentionally excluded to avoid exposing sensitive data
      };
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/bots/:id - Get a single bot
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    return res.json({ success: true, bot });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bots - Create a new bot
router.post('/', requireRole('user'), async (req, res) => {
  try {
    const request = req.body as CreateBotRequest;
    if (!request.name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }
    const bot = await manager.createBot(request);
    return res.status(201).json({ success: true, message: 'Bot created', bot });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// PUT /api/bots/:id - Update a bot
router.put('/:id', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const bot = await manager.updateBot(id, updates);
    return res.json({ success: true, message: 'Bot updated', bot });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// DELETE /api/bots/:id - Delete a bot
router.delete('/:id', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    await manager.deleteBot(id);
    return res.json({ success: true, message: 'Bot deleted' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/bots/:id/clone - Clone a bot
router.post('/:id/clone', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    if (!newName) {
      return res.status(400).json({ error: 'New bot name is required' });
    }
    const newBot = await manager.cloneBot(id, newName);
    return res.status(201).json({ success: true, message: 'Bot cloned', bot: newBot });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/bots/:id/start - Start a bot
router.post('/:id/start', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    await manager.startBot(id);
    return res.json({ success: true, message: 'Bot started' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/bots/:id/stop - Stop a bot
router.post('/:id/stop', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    await manager.stopBot(id);
    return res.json({ success: true, message: 'Bot stopped' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// GET /api/bots/:id/history - Get chat history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const channelId = req.query.channelId as string;

    const history = await manager.getBotHistory(id, channelId, limit);
    return res.json({ success: true, data: { history } });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: error.message });
  }
});

// GET /api/bots/:id/activity - Get activity logs
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);

    const bot = await manager.getBot(id);
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    const events = await ActivityLogger.getInstance().getEvents({
      botName: bot.name,
      limit,
    });

    const activity = events
      .map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        action: event.messageType.toUpperCase(),
        details: event.errorMessage || `Message length: ${event.contentLength}`,
        result: event.status,
        metadata: {
          type: 'MESSAGE',
          channelId: event.channelId,
          userId: event.userId,
        },
      }))
      .reverse();

    return res.json({ success: true, data: { activity } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
