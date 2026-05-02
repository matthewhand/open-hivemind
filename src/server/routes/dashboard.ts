import { Router, type Request, type Response } from 'express';
import { DatabaseManager } from '@src/database/DatabaseManager';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { createLogger } from '../../common/StructuredLogger';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { AnalyticsService } from '../../services/AnalyticsService';
import { HTTP_STATUS } from '../../types/constants';
import {
  DashboardActivityQuerySchema,
  DashboardAnnouncementQuerySchema,
  DashboardQuerySchema,
} from '../../validation/schemas/dashboardSchema';
import {
  AlertIdParamSchema,
  DashboardConfigSchema,
  DashboardFeedbackSchema,
} from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';
import { DashboardService } from '../services/DashboardService';
import { WebSocketService } from '../services/WebSocketService';

const router = Router();
const logger = createLogger('dashboardRouter');
const dashboardService = DashboardService.getInstance();

/**
 * GET /api/dashboard/ai/config
 */
router.get('/ai/config', authenticate, requireAdmin, (req: Request, res: Response) => {
  res.json(ApiResponse.success(dashboardService.getConfig()));
});

/**
 * POST /api/dashboard/ai/config
 */
router.post(
  '/ai/config',
  authenticate,
  requireAdmin,
  validateRequest(DashboardConfigSchema),
  (req: Request, res: Response) => {
    const config = dashboardService.updateConfig(req.body);
    res.json(ApiResponse.success(config));
  }
);

/**
 * GET /api/dashboard/ai/stats
 */
router.get(
  '/ai/stats',
  authenticate,
  requireAdmin,
  validateRequest(DashboardQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const analytics = AnalyticsService.getInstance();

    const { from, to } = req.query as any;

    const parseDate = (d: any): Date | undefined => {
      if (!d) return undefined;
      const date = new Date(d);
      return isNaN(date.getTime()) ? undefined : date;
    };

    const stats = await analytics.getStats({
      startTime: parseDate(from),
      endTime: parseDate(to),
    });

    res.json(
      ApiResponse.success({
        learningProgress: stats.learningProgress,
        behaviorPatternsCount: stats.behaviorPatternsCount,
        userSegmentsCount: stats.userSegmentsCount,
        totalMessages: stats.totalMessages,
        totalErrors: stats.totalErrors,
        avgProcessingTime: stats.avgProcessingTime,
        activeBots: stats.activeBots,
        activeUsers: stats.activeUsers,
      })
    );
  })
);

/**
 * GET /api/dashboard/ai/segments
 */
router.get(
  '/ai/segments',
  authenticate,
  requireAdmin,
  validateRequest(DashboardQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const analytics = AnalyticsService.getInstance();

    const { from, to } = req.query as any;

    const parseDate = (d: any): Date | undefined => {
      if (!d) return undefined;
      const date = new Date(d);
      return isNaN(date.getTime()) ? undefined : date;
    };

    const segments = await analytics.getUserSegments({
      startTime: parseDate(from),
      endTime: parseDate(to),
    });

    res.json(ApiResponse.success(segments));
  })
);

/**
 * GET /api/dashboard/ai/patterns
 */
router.get(
  '/ai/patterns',
  authenticate,
  requireAdmin,
  validateRequest(DashboardQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const analytics = AnalyticsService.getInstance();

    const { from, to } = req.query as any;

    const parseDate = (d: any): Date | undefined => {
      if (!d) return undefined;
      const date = new Date(d);
      return isNaN(date.getTime()) ? undefined : date;
    };

    const patterns = await analytics.getBehaviorPatterns({
      startTime: parseDate(from),
      endTime: parseDate(to),
    });

    res.json(ApiResponse.success(patterns));
  })
);

/**
 * GET /api/dashboard/ai/recommendations
 */
router.get(
  '/ai/recommendations',
  authenticate,
  requireAdmin,
  validateRequest(DashboardQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const analytics = AnalyticsService.getInstance();

    const { from, to } = req.query as any;

    const parseDate = (d: any): Date | undefined => {
      if (!d) return undefined;
      const date = new Date(d);
      return isNaN(date.getTime()) ? undefined : date;
    };

    const recommendations = await analytics.getRecommendations({
      startTime: parseDate(from),
      endTime: parseDate(to),
    });

    res.json(ApiResponse.success(recommendations));
  })
);

/**
 * POST /api/dashboard/ai/feedback
 */
router.post(
  '/ai/feedback',
  authenticate,
  requireAdmin,
  validateRequest(DashboardFeedbackSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { recommendationId, feedback, metadata } = req.body;
    const db = DatabaseManager.getInstance();
    await db.storeAIFeedback({ recommendationId, feedback, metadata });
    res.json(ApiResponse.success());
  })
);

/**
 * GET /api/dashboard/tips
 */
router.get(
  '/tips',
  asyncErrorHandler(async (_req: Request, res: Response) => {
    const tips = await dashboardService.getTips();
    return res.json(ApiResponse.success({ tips }));
  })
);

/**
 * GET /api/dashboard/config-status
 */
router.get(
  '/config-status',
  asyncErrorHandler(async (_req: Request, res: Response) => {
    const status = dashboardService.getConfigStatus();
    return res.json(ApiResponse.success(status));
  })
);

/**
 * GET /api/dashboard/announcement
 */
router.get(
  '/announcement',
  validateRequest(DashboardAnnouncementQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { providers, ratings } = req.query;
    if (providers || ratings) {
      logger.info('Announcement telemetry', {
        providers: providers ? String(providers) : undefined,
        ratings: ratings ? String(ratings) : undefined,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    }

    // Redirect to GitHub releases page
    res.redirect('https://github.com/matthewhand/open-hivemind/releases/latest');
  })
);

/**
 * GET /api/dashboard/status
 */
router.get(
  '/status',
  authenticate,
  requireAdmin,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const status = dashboardService.getStatus();
    res.json(ApiResponse.success(status));
  })
);

/**
 * GET /api/dashboard/activity
 */
router.get(
  '/activity',
  authenticate,
  requireAdmin,
  validateRequest(DashboardActivityQuerySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { bot, messageProvider, llmProvider, from, to, limit, offset } = req.query as any;

    const parseDate = (d: any): Date | undefined => {
      if (!d) return undefined;
      const date = new Date(d);
      return isNaN(date.getTime()) ? undefined : date;
    };

    const result = await dashboardService.getActivity({
      bot: Array.isArray(bot) ? bot : bot?.split(','),
      messageProvider: Array.isArray(messageProvider)
        ? messageProvider
        : messageProvider?.split(','),
      llmProvider: Array.isArray(llmProvider) ? llmProvider : llmProvider?.split(','),
      from: parseDate(from),
      to: parseDate(to),
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(ApiResponse.success(result));
  })
);

/**
 * POST /api/dashboard/alerts/:id/acknowledge
 */
router.post(
  '/alerts/:id/acknowledge',
  authenticate,
  requireAdmin,
  validateRequest(AlertIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ws = WebSocketService.getInstance();
    const success = ws.acknowledgeAlert(id);
    if (success) {
      res.json(ApiResponse.success());
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Alert not found', 'NOT_FOUND'));
    }
  })
);

/**
 * POST /api/dashboard/alerts/:id/resolve
 */
router.post(
  '/alerts/:id/resolve',
  authenticate,
  requireAdmin,
  validateRequest(AlertIdParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const ws = WebSocketService.getInstance();
    const success = ws.resolveAlert(id);
    if (success) {
      res.json(ApiResponse.success());
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Alert not found', 'NOT_FOUND'));
    }
  })
);

export default router;
