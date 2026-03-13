import { Router } from 'express';
import { requireAdmin } from '../../auth/middleware';
import { authenticateToken } from '../middleware/auth';
import { clearAllSystemCaches } from '../utils/cacheManager'; // We'll implement this

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
router.post('/clear', async (req, res) => {
  try {
    await clearAllSystemCaches();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

export default router;
