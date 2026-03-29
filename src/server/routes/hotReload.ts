import Debug from 'debug';
import { Router } from 'express';
import { WebSocketService } from '@src/server/services/WebSocketService';
import { HotReloadManager, type ConfigurationChange } from '@config/HotReloadManager';
import { ApiResponse } from "../utils/ApiResponse";

const debug = Debug('app:hotReloadRoutes');
const router = Router();

router.post('/api/config/hot-reload', async (req, res) => {
  try {
    const changeData: Omit<
      ConfigurationChange,
      'id' | 'timestamp' | 'validated' | 'applied' | 'rollbackAvailable'
    > = req.body;

    if (!changeData.changes || Object.keys(changeData.changes).length === 0) {
      return ApiResponse.error(res, 'No changes provided', 400, undefined, { message: 'No changes provided' });
    }

    const hotReloadManager = HotReloadManager.getInstance();
    const result = await hotReloadManager.applyConfigurationChange(changeData);

    return res.json(result);
  } catch (error) {
    debug('Hot reload API error:', error);
    return ApiResponse.error(res, process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error', 500, undefined, { message: 'Hot reload failed' });
  }
});

router.get('/api/config/hot-reload/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const hotReloadManager = HotReloadManager.getInstance();
    const history = hotReloadManager.getChangeHistory(limit);

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    debug('Hot reload history API error:', error);
    return ApiResponse.error(res, process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error', 500, undefined, { message: 'Failed to get change history' });
  }
});

router.get('/api/config/hot-reload/rollbacks', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();
    const rollbacks = hotReloadManager.getAvailableRollbacks();

    return res.json({
      success: true,
      rollbacks,
    });
  } catch (error) {
    debug('Hot reload rollbacks API error:', error);
    return ApiResponse.error(res, process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error', 500, undefined, { message: 'Failed to get available rollbacks' });
  }
});

router.post('/api/config/hot-reload/rollback/:snapshotId', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const hotReloadManager = HotReloadManager.getInstance();

    const success = await hotReloadManager.rollbackToSnapshot(snapshotId);

    if (success) {
      // Notify via WebSocket
      const wsService = WebSocketService.getInstance();
      wsService.recordAlert({
        level: 'warning',
        title: 'Configuration Rolled Back',
        message: `Configuration rolled back to snapshot ${snapshotId}`,
        metadata: { snapshotId },
      });

      return res.json({
        success: true,
        message: 'Configuration rolled back successfully',
      });
    } else {
      return ApiResponse.error(res, 'Rollback snapshot not found or rollback failed', 404, undefined, { message: 'Rollback snapshot not found or rollback failed' });
    }
  } catch (error) {
    debug('Hot reload rollback API error:', error);
    return ApiResponse.error(res, process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error', 500, undefined, { message: 'Rollback failed' });
  }
});

router.get('/api/config/hot-reload/status', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();

    return res.json({
      success: true,
      status: {
        isActive: true, // Hot reload is always active in this implementation
        changeHistoryCount: hotReloadManager.getChangeHistory().length,
        availableRollbacksCount: hotReloadManager.getAvailableRollbacks().length,
        lastChange: hotReloadManager.getChangeHistory(1)[0] || null,
      },
    });
  } catch (error) {
    debug('Hot reload status API error:', error);
    return ApiResponse.error(res, process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error', 500, undefined, { message: 'Failed to get hot reload status' });
  }
});

export default router;
