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
  } catch (error: unknown) {
    logger.error(
      'Failed to retrieve bots',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to retrieve bots' });
  }
});

/**
 * @openapi
 * /api/bots/reorder:
 *   put:
 *     summary: Reorder bots
 *     tags: [Bots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *             required: [ids]
 *     responses:
 *       200:
 *         description: Bots reordered
 */
router.put('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ error: 'ids must be a non-empty array of bot IDs' });
    }

    const fsModule = await import('fs');
    const pathModule = await import('path');
    const orderFilePath = pathModule.join(process.cwd(), 'config', 'user', 'bot-order.json');
    const orderDir = pathModule.dirname(orderFilePath);
    if (!fsModule.existsSync(orderDir)) {
      fsModule.mkdirSync(orderDir, { recursive: true });
    }
    fsModule.writeFileSync(orderFilePath, JSON.stringify(ids, null, 2));

    return res.json({ success: true, message: 'Bot order updated' });
  } catch (error: unknown) {
    logger.error(
      'Failed to reorder bots',
      error instanceof Error ? error : new Error(String(error))
    );
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to reorder bots' });
  }
});

// ── Export / Import ─────────────────────────────────────────────────────

const EXPORT_SCHEMA_VERSION = 1;

function sanitizeBotForExport(bot: any): any {
  const { envOverrides, ...rest } = bot;
  const sensitiveKeys = [
    'token', 'apikey', 'bottoken', 'apptoken',
    'signingsecret', 'accesstoken', 'secret',
  ];
  const cleanConfig: Record<string, unknown> = {};
  if (rest.config && typeof rest.config === 'object') {
    for (const [k, v] of Object.entries(rest.config as Record<string, unknown>)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        cleanConfig[k] = '***REDACTED***';
      } else {
        cleanConfig[k] = v;
      }
    }
  }
  return { ...rest, config: cleanConfig };
}

/**
 * @openapi
 * /api/bots/export:
 *   get:
 *     summary: Export all bots (sensitive fields redacted)
 *     tags: [Bots]
 *     responses:
 *       200:
 *         description: Exported bots payload
 */
router.get('/export', async (_req, res) => {
  try {
    const bots = await manager.getAllBots();
    const sanitized = bots.map(sanitizeBotForExport);
    return res.json({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      bots: sanitized,
    });
  } catch (error: unknown) {
    logger.error('Failed to export bots', error instanceof Error ? error : new Error(String(error)));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to export bots' });
  }
});

/**
 * @openapi
 * /api/bots/import:
 *   post:
 *     summary: Import bots with create/update report
 *     tags: [Bots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bots:
 *                 type: array
 *     responses:
 *       200:
 *         description: Import report
 */
router.post('/import', async (req, res) => {
  try {
    const { bots: incoming } = req.body;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Request body must contain a non-empty "bots" array' });
    }

    const existingBots = await manager.getAllBots();
    const existingByName = new Map(existingBots.map((b) => [b.name.toLowerCase(), b]));

    const report = { created: [] as string[], updated: [] as string[], skipped: [] as string[], errors: [] as string[] };

    for (const bot of incoming) {
      try {
        if (!bot.name) {
          report.errors.push('Skipped bot with no name');
          continue;
        }
        // Strip fields that should not be imported directly
        const { id, status, messageCount, errorCount, ...importData } = bot;

        const existing = existingByName.get(bot.name.toLowerCase());
        if (existing) {
          await manager.updateBot(existing.id, importData);
          report.updated.push(bot.name);
        } else {
          await manager.createBot(importData as CreateBotRequest);
          report.created.push(bot.name);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        report.errors.push(`${bot.name || 'unknown'}: ${msg}`);
      }
    }

    ActivityLogger.log(req, 'import_bots', {
      created: report.created.length,
      updated: report.updated.length,
      errors: report.errors.length,
    });

    return res.json({ success: true, report });
  } catch (error: unknown) {
    logger.error('Failed to import bots', error instanceof Error ? error : new Error(String(error)));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to import bots' });
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
  } catch (error: unknown) {
    logger.error(
      'Failed to retrieve bot',
      error instanceof Error ? error : new Error(String(error)),
      { id: req.params.id }
    );
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
  } catch (error: unknown) {
    logger.error(
      'Failed to retrieve bot activity',
      error instanceof Error ? error : new Error(String(error)),
      { id: req.params.id }
    );
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to retrieve bot activity' });
  }
});

/**
 * @openapi
 * /api/bots/{id}/export:
 *   get:
 *     summary: Export a single bot (sensitive fields redacted)
 *     tags: [Bots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Single bot export payload
 *       404:
 *         description: Bot not found
 */
router.get('/:id/export', validateRequest(BotIdParamSchema), async (req, res) => {
  try {
    const bot = await manager.getBot(req.params.id);
    if (!bot) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Bot not found', code: ERROR_CODES.NOT_FOUND });
    }
    const sanitized = sanitizeBotForExport(bot);
    return res.json({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      bots: [sanitized],
    });
  } catch (error: unknown) {
    logger.error('Failed to export bot', error instanceof Error ? error : new Error(String(error)));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to export bot' });
  }
});

export default router;
