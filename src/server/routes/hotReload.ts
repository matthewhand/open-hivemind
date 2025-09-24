import { Router } from 'express';
import { HotReloadManager, ConfigurationChange } from '@config/HotReloadManager';
import { WebSocketService } from '@src/server/services/WebSocketService';
import Debug from 'debug';

const debug = Debug('app:hotReloadRoutes');
const router = Router();

router.post('/api/config/hot-reload', async (req, res) => {
  try {
    const changeData: Omit<ConfigurationChange, 'id' | 'timestamp' | 'validated' | 'applied' | 'rollbackAvailable'> = req.body;

    if (!changeData.changes || Object.keys(changeData.changes).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided'
      });
    }

    const hotReloadManager = HotReloadManager.getInstance();
    const result = await hotReloadManager.applyConfigurationChange(changeData);

    res.json(result);
  } catch (error) {
    debug('Hot reload API error:', error);
    res.status(500).json({
      success: false,
      message: 'Hot reload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/api/config/hot-reload/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const hotReloadManager = HotReloadManager.getInstance();
    const history = hotReloadManager.getChangeHistory(limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    debug('Hot reload history API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get change history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/api/config/hot-reload/rollbacks', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();
    const rollbacks = hotReloadManager.getAvailableRollbacks();

    res.json({
      success: true,
      rollbacks
    });
  } catch (error) {
    debug('Hot reload rollbacks API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available rollbacks',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
        metadata: { snapshotId }
      });

      res.json({
        success: true,
        message: 'Configuration rolled back successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Rollback snapshot not found or rollback failed'
      });
    }
  } catch (error) {
    debug('Hot reload rollback API error:', error);
    res.status(500).json({
      success: false,
      message: 'Rollback failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/api/config/hot-reload/status', (req, res) => {
  try {
    const hotReloadManager = HotReloadManager.getInstance();

    res.json({
      success: true,
      status: {
        isActive: true, // Hot reload is always active in this implementation
        changeHistoryCount: hotReloadManager.getChangeHistory().length,
        availableRollbacksCount: hotReloadManager.getAvailableRollbacks().length,
        lastChange: hotReloadManager.getChangeHistory(1)[0] || null
      }
    });
  } catch (error) {
    debug('Hot reload status API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hot reload status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;