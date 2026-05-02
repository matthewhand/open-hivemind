/* eslint-disable max-lines */
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { createLogger } from '../../common/StructuredLogger';
import { DatabaseManager } from '../../database/DatabaseManager';
import { BotManager } from '../../managers/BotManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { ERROR_CODES, HTTP_STATUS } from '../../types/constants';
import {
  BotActivityQuerySchema,
  BotGenerateConfigSchema,
  BotHistoryQuerySchema,
  BotIdParamSchema,
  BotImportSchema,
  BotTaskCreateSchema,
  BotTestChatSchema,
  BotVersionParamSchema,
  CloneBotSchema,
  CreateBotSchema,
  UpdateBotSchema,
} from '../../validation/schemas/botsSchema';
import { ReorderSchema } from '../../validation/schemas/commonSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ActivityLogger } from '../services/ActivityLogger';
import { BotBenchmarkService } from '../services/BotBenchmarkService';
import { BotInsightsService } from '../services/BotInsightsService';
import { BotRouteService } from '../services/BotRouteService';
import { BotStressTestService } from '../services/BotStressTestService';
import { BotTaskScheduler } from '../services/BotTaskScheduler';
import { ConfigurationVersionService } from '../services/ConfigurationVersionService';
import { WebSocketService } from '../services/WebSocketService';

const router = Router();
const logger = createLogger('botsRouter');
const managerPromise = BotManager.getInstance();
const botRouteService = BotRouteService.getInstance();

let _wsService: WebSocketService | null = null;

const getWsService = () => {
  if (!_wsService) {
    try {
      _wsService = WebSocketService.getInstance();
    } catch {
      /* DI not ready */
    }
  }
  return _wsService;
};

const EXPORT_SCHEMA_VERSION = 1;

/**
 * @openapi
 * /api/bots:
 *   get:
 *     summary: List all bots with status
 *     tags: [Bots]
 */
router.get(
  '/',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const bots = await manager.getAllBots();
    const statuses = await manager.getBotsStatus();
    const statusMap = new Map(statuses.map((s) => [s.id, s.isRunning]));

    const result = bots.map((bot) => {
      const stats = getWsService()?.getBotStats(bot.name) || {
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
      };
    });

    return res.json(ApiResponse.success(result));
  })
);

/**
 * @openapi
 * /api/bots/reorder:
 *   put:
 *     summary: Reorder bots
 *     tags: [Bots]
 */
router.put(
  '/reorder',
  validateRequest(ReorderSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    await botRouteService.reorderBots(ids);
    return res.json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/export:
 *   get:
 *     summary: Export all bots (sensitive fields redacted)
 *     tags: [Bots]
 */
router.get(
  '/export',
  asyncErrorHandler(async (_req: Request, res: Response) => {
    const manager = await managerPromise;
    const bots = await manager.getAllBots();
    const sanitized = bots.map((bot) => botRouteService.sanitizeBotForExport(bot));
    return res.json(
      ApiResponse.success({
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        bots: sanitized,
      })
    );
  })
);

/**
 * @openapi
 * /api/bots/import:
 *   post:
 *     summary: Import bots with create/update report
 *     tags: [Bots]
 */
router.post(
  '/import',
  validateRequest(BotImportSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { bots: incoming } = req.body;
    const report = await botRouteService.importBots(incoming);

    logger.info('import_bots', {
      created: report.created.length,
      updated: report.updated.length,
      errors: report.errors.length,
    });

    return res.json(ApiResponse.success(report));
  })
);

/**
 * @openapi
 * /api/bots/{id}:
 *   get:
 *     summary: Get a single bot
 *     tags: [Bots]
 */
router.get(
  '/:id',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const statuses = await manager.getBotsStatus();
    const statusMap = new Map(statuses.map((s) => [s.id, s.isRunning]));
    const stats = getWsService()?.getBotStats(bot.name) || {
      messageCount: 0,
      errors: [],
      errorCount: 0,
    };

    const result = {
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
      config: bot.config,
      isActive: bot.isActive,
    };

    return res.json(ApiResponse.success(result));
  })
);

/**
 * @openapi
 * /api/bots:
 *   post:
 *     summary: Create a new bot
 *     tags: [Bots]
 */
router.post(
  '/',
  validateRequest(CreateBotSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const request = req.body;
    const allBots = await manager.getAllBots();
    const existingBot = allBots.find((b) => b.name === request.name);
    if (existingBot) {
      return res.status(HTTP_STATUS.OK).json(ApiResponse.success());
    }

    await manager.createBot(request);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/{id}:
 *   put:
 *     summary: Update a bot
 *     tags: [Bots]
 */
router.put(
  '/:id',
  validateRequest(UpdateBotSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;
    const updates = req.body;
    try {
      await manager.updateBot(id, updates);
      return res.json(ApiResponse.success());
    } catch (error: any) {
      const status = error.message?.includes(ERROR_CODES.NOT_FOUND)
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.BAD_REQUEST;
      return res.status(status).json(ApiResponse.error(error.message || 'Update failed'));
    }
  })
);

/**
 * @openapi
 * /api/bots/{id}:
 *   delete:
 *     summary: Delete a bot
 *     tags: [Bots]
 */
router.delete(
  '/:id',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;
    const existingBot = await manager.getBot(id);
    if (!existingBot) {
      return res.json(ApiResponse.success());
    }

    await manager.deleteBot(id);
    return res.json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/{id}/clone:
 *   post:
 *     summary: Clone a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/clone',
  validateRequest(CloneBotSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;
    const { newName } = req.body;

    const allBots = await manager.getAllBots();
    const existingBot = allBots.find((b) => b.name === newName);
    if (existingBot) {
      return res.status(HTTP_STATUS.OK).json(ApiResponse.success());
    }

    await manager.cloneBot(id, newName);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/{id}/start:
 *   post:
 *     summary: Start a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/start',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;

    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    await manager.startBot(id);
    return res.json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/{id}/stop:
 *   post:
 *     summary: Stop a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/stop',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;

    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    await manager.stopBot(id);
    return res.json(ApiResponse.success());
  })
);

/**
 * @openapi
 * /api/bots/{id}/history:
 *   get:
 *     summary: Get chat history
 *     tags: [Bots]
 */
router.get(
  '/:id/history',
  validateRequest(BotHistoryQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;

    const { limit, channelId } = req.query as any;

    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    let parsedLimit = limit ? parseInt(limit as string, 10) : 20;
    // Clamp limit to 1-100
    if (parsedLimit < 1) parsedLimit = 1;
    if (parsedLimit > 100) parsedLimit = 100;

    const history = await manager.getBotHistory(id, channelId, parsedLimit);
    return res.json(ApiResponse.success({ history }));
  })
);

/**
 * @openapi
 * /api/bots/{id}/activity:
 *   get:
 *     summary: Get activity logs
 *     tags: [Bots]
 */
router.get(
  '/:id/activity',
  validateRequest(BotActivityQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;

    const { limit } = req.query as any;

    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const events = await ActivityLogger.getInstance().getEvents({
      botName: bot.name,
      limit,
    });

    const redactPII = (val: string | undefined): string | undefined => {
      if (!val) return val;
      if (val.length <= 3) return '***';
      return val.substring(0, 1) + '***' + val.substring(val.length - 1);
    };

    const activity = events
      .map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        action: event.messageType.toUpperCase(),
        details: event.errorMessage || `Message length: ${event.contentLength}`,
        result: event.status,
        metadata: {
          type: 'MESSAGE',
          channelId: redactPII(event.channelId),
          userId: redactPII(event.userId),
        },
      }))
      .reverse();

    return res.json(ApiResponse.success({ activity }));
  })
);

/**
 * @openapi
 * /api/bots/{id}/versions:
 *   get:
 *     summary: Get bot configuration versions
 *     tags: [Bots]
 */
router.get(
  '/:id/versions',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id } = req.params;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const dbManager = DatabaseManager.getInstance();
    const config = await dbManager.getBotConfigurationByName(bot.name);
    if (!config || !config.id) {
      return res.json(ApiResponse.success({ versions: [] }));
    }

    const versionHistory = await ConfigurationVersionService.getInstance().getVersionHistory(
      config.id
    );
    return res.json(ApiResponse.success(versionHistory));
  })
);

/**
 * @openapi
 * /api/bots/{id}/versions/:versionId/restore:
 *   post:
 *     summary: Restore a bot configuration version
 *     tags: [Bots]
 */
router.post(
  '/:id/versions/:versionId/restore',
  validateRequest(BotVersionParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const { id, versionId } = req.params;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const dbManager = DatabaseManager.getInstance();
    const config = await dbManager.getBotConfigurationByName(bot.name);
    if (!config || !config.id) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot configuration not found'));
    }

    await ConfigurationVersionService.getInstance().restoreVersion(config.id, versionId, 'system');
    await manager.restartBot(id);

    return res.json(ApiResponse.success({ message: `Restored to version ${versionId}` }));
  })
);

/**
 * @openapi
 * /api/bots/{id}/export:
 *   get:
 *     summary: Export a single bot (sensitive fields redacted)
 *     tags: [Bots]
 */
router.get(
  '/:id/export',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const bot = await manager.getBot(req.params.id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }
    const sanitized = botRouteService.sanitizeBotForExport(bot);
    return res.json(
      ApiResponse.success({
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        bots: [sanitized],
      })
    );
  })
);

/**
 * @openapi
 * /api/bots/generate-config:
 *   post:
 *     summary: Generate bot configuration using AI
 *     tags: [Bots]
 */
router.post(
  '/generate-config',
  validateRequest(BotGenerateConfigSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { description } = req.body;
    try {
      const generated = await botRouteService.generateConfig(description);
      return res.json(ApiResponse.success(generated));
    } catch (error: any) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message || 'Generation failed'));
    }
  })
);

/**
 * @openapi
 * /api/bots/{id}/diagnose:
 *   get:
 *     summary: Run deep diagnostic on a bot
 *     tags: [Bots]
 */
router.get(
  '/:id/diagnose',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    try {
      const results = await botRouteService.runDiagnostic(req.params.id);
      return res.json(ApiResponse.success(results));
    } catch (error: any) {
      const status =
        error.message === 'Bot not found'
          ? HTTP_STATUS.NOT_FOUND
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return res.status(status).json(ApiResponse.error(error.message || 'Diagnostic failed'));
    }
  })
);

/**
 * @openapi
 * /api/bots/test-chat:
 *   post:
 *     summary: Test a persona configuration in a sandbox
 *     tags: [Bots]
 */
router.post(
  '/test-chat',
  validateRequest(BotTestChatSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { botConfig, message, history } = req.body;
    try {
      const response = await botRouteService.testChat(botConfig, message, history);
      return res.json(ApiResponse.success({ response }));
    } catch (error: any) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(error.message || 'Test chat failed'));
    }
  })
);

/**
 * @openapi
 * /api/bots/{id}/insights:
 *   get:
 *     summary: Get AI-driven performance insights for a bot
 *     tags: [Bots]
 */
router.get(
  '/:id/insights',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const bot = await manager.getBot(req.params.id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const insights = await BotInsightsService.getInstance().generateInsights(bot);
    return res.json(ApiResponse.success(insights));
  })
);

/**
 * @openapi
 * /api/bots/{id}/benchmark:
 *   post:
 *     summary: Run standardized performance benchmark for a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/benchmark',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const bot = await manager.getBot(req.params.id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const summary = await BotBenchmarkService.getInstance().runBenchmark(bot);
    return res.json(ApiResponse.success(summary));
  })
);

/**
 * @openapi
 * /api/bots/{id}/stress-test:
 *   post:
 *     summary: Run adversarial stress test for a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/stress-test',
  validateRequest(BotIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const manager = await managerPromise;
    const bot = await manager.getBot(req.params.id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const report = await BotStressTestService.getInstance().runStressTest(bot);
    return res.json(ApiResponse.success(report));
  })
);

/**
 * @openapi
 * /api/bots/{id}/tasks:
 *   post:
 *     summary: Schedule a new task for a bot
 *     tags: [Bots]
 */
router.post(
  '/:id/tasks',
  validateRequest(BotTaskCreateSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { prompt, intervalMinutes } = req.body;
    const { id } = req.params;

    const manager = await managerPromise;
    const bot = await manager.getBot(id);
    if (!bot) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error('Bot not found', ERROR_CODES.NOT_FOUND));
    }

    const task = await BotTaskScheduler.getInstance().scheduleTask(
      bot.id,
      bot.name,
      prompt,
      intervalMinutes
    );
    return res.json(ApiResponse.success(task));
  })
);

export default router;
