import Debug from 'debug';
import { Router } from 'express';
import { requireAdmin } from '../../auth/middleware';
import { HTTP_STATUS } from '../../types/constants';
import { ClearCacheSchema } from '../../validation/schemas/miscSchema';
import { validateRequest } from '../../validation/validateRequest';
import { authenticateToken } from '../middleware/auth';
import { clearAllSystemCaches } from '../utils/cacheManager'; // We'll implement this

const debug = Debug('app:server:routes:cache');

const router = Router();

// Apply authentication to all cache routes
router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/cache/clear:
 *   post:
 *     summary: Clear system cache
 *     description: Clears in-memory caches, require caches, and other temporary storage
 *     tags: [Cache]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/clear', validateRequest(ClearCacheSchema), async (req, res) => {
  try {
    await clearAllSystemCaches();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    debug('ERROR:', 'Failed to clear cache:', error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: 'Failed to clear cache' });
  }
});

export default router;
