import { Router, type Request, type Response } from 'express';
import { IntegrationAnomalyDetector } from '@src/monitoring/IntegrationAnomalyDetector';
import Logger from '@common/logger';
import { CostAnalyticsService } from '../services/CostAnalyticsService';

const logger = Logger.withContext('routes:monitoring');
const router = Router();

/**
 * @route GET /api/monitoring/costs
 * @desc Get historical cost data
 * @access Private
 */
router.get('/costs', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const service = CostAnalyticsService.getInstance();

    const historical = service.getHistoricalCosts(days);
    const daily = service.getDailyCosts(days);

    res.json({
      success: true,
      data: {
        historical,
        daily,
        summary: {
          totalCost: daily.reduce((sum, d) => sum + d.cost, 0),
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch cost data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost data',
    });
  }
});

/**
 * @route GET /api/monitoring/anomalies
 * @desc Get a summary of detected integration anomalies (Discord, Slack,
 *       Mattermost, LLM providers, etc.) produced by IntegrationAnomalyDetector.
 * @access Private
 */
router.get('/anomalies', (req: Request, res: Response) => {
  try {
    const detector = IntegrationAnomalyDetector.getInstance();

    const integration =
      typeof req.query.integration === 'string' ? req.query.integration : undefined;
    const minutesRaw = parseInt(req.query.minutes as string, 10);
    const minutes = Number.isFinite(minutesRaw) && minutesRaw > 0 ? minutesRaw : undefined;

    const recent =
      minutes !== undefined
        ? detector.getRecentAnomalies(minutes, integration)
        : detector.getActiveAnomalies(integration);

    res.json({
      success: true,
      data: {
        summary: detector.getAnomalySummary(),
        anomalies: recent,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch integration anomalies', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration anomalies',
    });
  }
});

export default router;
