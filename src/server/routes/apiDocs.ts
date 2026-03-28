import { Router, type Request, type Response } from 'express';
import { introspectRoutes } from '../utils/routeIntrospection';

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
router.get('/', (req: Request, res: Response) => {
  try {
    const app = req.app;
    const groups = introspectRoutes(app);
    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        groups,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: 'Failed to generate API documentation',
      message,
    });
  }
});

export default router;
