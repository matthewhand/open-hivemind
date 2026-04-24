import { Router, type Request, type Response } from 'express';
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

export default router;
