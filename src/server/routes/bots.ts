import { Router } from 'express';
import { createLogger } from '../../common/StructuredLogger';
import { BotManager, type CreateBotRequest } from '../../managers/BotManager';
import { ERROR_CODES, HTTP_STATUS } from '../../types/constants';
import {
  BotActivityQuerySchema,
  BotHistoryQuerySchema,
  BotIdParamSchema,
  CloneBotSchema,
  CreateBotSchema,
  UpdateBotSchema,
} from '../../validation/schemas/botsSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ActivityLogger } from '../services/ActivityLogger';
import { WebSocketService } from '../services/WebSocketService';

const router = Router();
const logger = createLogger('botsRouter');
const manager = BotManager.getInstance();
const wsService = WebSocketService.getInstance();

/**
 * @openapi
 * /api/bots:
 *   get:
 *     summary: List all bots with status
 *     tags: [Bots]
 *     responses:
 *       200:
 *         description: List of bots
 */
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
    logger.error('Failed to retrieve bots', { error: error.message });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve bots' });
  }
});

/**
 * @openapi
 * /api/bots/{id}:
 *   get:
 *     summary: Get a single bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bot details
 *       404:
 *         description: Bot not found
 */
router.get('/:id', validateRequest(BotIdParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Bot not found' });
    }
    return res.json({ success: true, bot });
  } catch (error: any) {
    logger.error('Failed to retrieve bot', { id: req.params.id, error: error.message });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve bot' });
  }
});

/**
 * @openapi
 * /api/bots:
 *   post:
 *     summary: Create a new bot
 *     tags: [Bots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *             required: [name]
 *     responses:
 *       201:
 *         description: Bot created
 */
router.post('/', validateRequest(CreateBotSchema), async (req, res) => {
  try {
    const request = req.body as CreateBotRequest;
    // Idempotency check: see if bot with same name exists
    const allBots = await manager.getAllBots();
    const existingBot = allBots.find((b) => b.name === request.name);
    if (existingBot) {
      return res
        .status(HTTP_STATUS.OK)
        .json({ success: true, message: 'Bot already exists', bot: existingBot });
    }

    const bot = await manager.createBot(request);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Bot created', bot });
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}:
 *   put:
 *     summary: Update a bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               messageProvider: { type: string }
 *               llmProvider: { type: string }
 *               persona: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Bot updated
 */
router.put('/:id', validateRequest(UpdateBotSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const bot = await manager.updateBot(id, updates);
    return res.json({ success: true, message: 'Bot updated', bot });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}:
 *   delete:
 *     summary: Delete a bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bot deleted
 */
router.delete('/:id', validateRequest(BotIdParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    // Idempotency: return 200/204 even if resource already gone
    const existingBot = await manager.getBot(id);
    if (!existingBot) {
      return res.json({ success: true, message: 'Bot already deleted or not found' });
    }

    await manager.deleteBot(id);
    return res.json({ success: true, message: 'Bot deleted' });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}/clone:
 *   post:
 *     summary: Clone a bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newName: { type: string }
 *             required: [newName]
 *     responses:
 *       201:
 *         description: Bot cloned
 */
router.post('/:id/clone', validateRequest(CloneBotSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    // Idempotency check: see if cloned bot already exists
    const allBots = await manager.getAllBots();
    const existingBot = allBots.find((b) => b.name === newName);
    if (existingBot) {
      return res
        .status(HTTP_STATUS.OK)
        .json({ success: true, message: 'Bot clone already exists', bot: existingBot });
    }

    const newBot = await manager.cloneBot(id, newName);
    return res
      .status(HTTP_STATUS.CREATED)
      .json({ success: true, message: 'Bot cloned', bot: newBot });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}/start:
 *   post:
 *     summary: Start a bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bot started
 */
router.post('/:id/start', validateRequest(BotIdParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    await manager.startBot(id);
    return res.json({ success: true, message: 'Bot started' });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}/stop:
 *   post:
 *     summary: Stop a bot
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bot stopped
 */
router.post('/:id/stop', validateRequest(BotIdParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    await manager.stopBot(id);
    return res.json({ success: true, message: 'Bot stopped' });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/bots/{id}/history:
 *   get:
 *     summary: Get chat history
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: channelId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bot history
 */
router.get('/:id/history', validateRequest(BotHistoryQuerySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const reqQuery = req.query as any;
    const limit = Math.min(Math.max(parseInt(reqQuery.limit as string) || 20, 1), 100);
    const channelId = req.query.channelId as string;

    const history = await manager.getBotHistory(id, channelId, limit);
    return res.json({ success: true, data: { history } });
  } catch (error: any) {
    const status = error.message.includes(ERROR_CODES.NOT_FOUND)
      ? HTTP_STATUS.NOT_FOUND
      : HTTP_STATUS.BAD_REQUEST;
    return res.status(status).json({ error: error.message });
  }
});

/**
 * Redacts a string by fully masking short strings and partially masking longer ones.
 * Useful for preventing PII (like User IDs and Channel IDs) from leaking to the frontend.
 */
function redactString(val: string | undefined): string | undefined {
  if (!val) return val;
  if (val.length <= 3) return '***';
  return val.substring(0, 1) + '***' + val.substring(val.length - 1);
}

/**
 * @openapi
 * /api/bots/{id}/activity:
 *   get:
 *     summary: Get activity logs
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bot activity
 */
router.get('/:id/activity', validateRequest(BotActivityQuerySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const reqQuery = req.query as any;
    const limit = Math.min(Math.max(parseInt(reqQuery.limit as string) || 20, 1), 100);

    const bot = await manager.getBot(id);
    if (!bot) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Bot not found' });
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
          channelId: redactString(event.channelId),
          userId: redactString(event.userId),
        },
      }))
      .reverse();

    return res.json({ success: true, data: { activity } });
  } catch (error: any) {
    logger.error('Failed to retrieve bot activity', { id: req.params.id, error: error.message });
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to retrieve bot activity' });
  }
});

export default router;
