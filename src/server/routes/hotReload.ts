import Debug from 'debug';
import { Router } from 'express';
import { WebSocketService } from '@src/server/services/WebSocketService';
import { HotReloadManager, type ConfigurationChange } from '@config/HotReloadManager';
import { validateRequest } from '../../validation/validateRequest';
import { ApiResponse } from '../../utils/apiResponse';
import {
  HotReloadChangeSchema,
  HotReloadRollbackSchema,
} from '../../validation/schemas/hotReloadSchema';

const debug = Debug('app:hotReloadRoutes');
const router = Router();

router.post('/api/config/hot-reload', validateRequest(HotReloadChangeSchema), async (req, res) => {
  try {
    const changeData: Omit<
      ConfigurationChange,
      'id' | 'timestamp' | 'validated' | 'applied' | 'rollbackAvailable'
    > = req.body;

    const hotReloadManager = HotReloadManager.getInstance();
    const result = await hotReloadManager.applyConfigurationChange(changeData);

    return res.json(result);
  } catch (error) {
    debug('Hot reload API error:', error);
    return ApiResponse.serverError(res, 'Hot reload failed', process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error instanceof Error
            ? error.message
            : 'Unknown error',);
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
    return ApiResponse.serverError(res, 'Failed to get change history', process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error instanceof Error
            ? error.message
            : 'Unknown error',);
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
    return ApiResponse.serverError(res, 'Failed to get available rollbacks', process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error instanceof Error
            ? error.message
            : 'Unknown error',);
  }
});

router.post('/api/config/hot-reload/rollback/:snapshotId', validateRequest(HotReloadRollbackSchema), async (req, res) => {
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

      return ApiResponse.success(res, undefined, 'Configuration rolled back successfully',);
    } else {
      return ApiResponse.notFound(res, 'Rollback snapshot not found or rollback failed',);
    }
  } catch (error) {
    debug('Hot reload rollback API error:', error);
    return ApiResponse.serverError(res, 'Rollback failed', process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error instanceof Error
            ? error.message
            : 'Unknown error',);
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
    return ApiResponse.serverError(res, 'Failed to get hot reload status', process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : error instanceof Error
            ? error.message
            : 'Unknown error',);
  }
});

export default router;
