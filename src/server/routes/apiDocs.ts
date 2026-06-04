import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { introspectRoutes } from '../utils/routeIntrospection';
import { apiLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @openapi
 * /api/docs:
 *   get:
 *     summary: Get auto-generated API route catalog
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Route catalog grouped by prefix
 */
router.get(
  '/',
  apiLimiter,
  asyncErrorHandler(async (req: Request, res: Response) => {
    const app = req.app;
    const groups = await introspectRoutes(app);
    return res.json(
      ApiResponse.success({
        generatedAt: new Date().toISOString(),
        groups,
      })
    );
  })
);

export default router;
