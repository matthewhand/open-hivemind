import Debug from 'debug';
import { Router } from 'express';
import { WebSocketService } from '@src/server/services/WebSocketService';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HotReloadManager, type ConfigurationChange } from '@config/HotReloadManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import {
  HotReloadChangeSchema,
  SnapshotIdParamSchema,
} from '../../validation/schemas/hotReloadSchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:hotReloadRoutes');
const router = Router();

router.post(
  '/api/config/hot-reload',
  validateRequest(HotReloadChangeSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const changeData: Omit<
        ConfigurationChange,
        'id' | 'timestamp' | 'validated' | 'applied' | 'rollbackAvailable'
      > = req.body;

      if (!changeData.changes || Object.keys(changeData.changes).length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('No changes provided'));
      }

      const hotReloadManager = HotReloadManager.getInstance();
      const result = await hotReloadManager.applyConfigurationChange(changeData);

      return res.json(ApiResponse.success(result));
    } catch (error) {
      debug('Hot reload API error:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error'
          )
        );
    }
  })
);

router.get('/api/config/hot-reload/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const hotReloadManager = HotReloadManager.getInstance();
    const history = hotReloadManager.getChangeHistory(limit);

    return res.json(ApiResponse.success());
  } catch (error) {
    debug('Hot reload history API error:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse.error(
          process.env.NODE_ENV === 'production'
            ? 'An internal error occurred'
            : error instanceof Error
              ? error.message
              : 'Unknown error'
        )
      );
  }
});

router.get('/api/config/hot-reload/rollbacks', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();
    const rollbacks = hotReloadManager.getAvailableRollbacks();

    return res.json(ApiResponse.success());
  } catch (error) {
    debug('Hot reload rollbacks API error:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse.error(
          process.env.NODE_ENV === 'production'
            ? 'An internal error occurred'
            : error instanceof Error
              ? error.message
              : 'Unknown error'
        )
      );
  }
});

router.post(
  '/api/config/hot-reload/rollback/:snapshotId',
  validateRequest(SnapshotIdParamSchema),
  async (req, res) => {
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

        return res.json(ApiResponse.success());
      } else {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json(ApiResponse.error('Rollback snapshot not found or rollback failed'));
      }
    } catch (error) {
      debug('Hot reload rollback API error:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(
          ApiResponse.error(
            process.env.NODE_ENV === 'production'
              ? 'An internal error occurred'
              : error instanceof Error
                ? error.message
                : 'Unknown error'
          )
        );
    }
  }
);

router.get('/api/config/hot-reload/status', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();

    return res.json(ApiResponse.success());
  } catch (error) {
    debug('Hot reload status API error:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(
        ApiResponse.error(
          process.env.NODE_ENV === 'production'
            ? 'An internal error occurred'
            : error instanceof Error
              ? error.message
              : 'Unknown error'
        )
      );
  }
});

export default router;
