import Debug from 'debug';
import { Router } from 'express';
import { DatabaseManager, type Anomaly } from '../../database/DatabaseManager';
import { AnomalyDetectionService } from '../../services/AnomalyDetectionService';

const debug = Debug('app:webui:anomaly');
const router = Router();

/**
 * Checks if an error is a database connection error.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('connect') ||
      message.includes('database') ||
      message.includes('sqlite') ||
      message.includes('sql')
    );
  }
  return false;
}

// GET /api/anomalies - Get active anomalies
router.get('/', async (req, res) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    // Get tenantId from request user if available (assuming req.user is populated by authenticateToken)
    // The authenticateToken middleware usually populates req.user
    const tenantId = (req as any).user?.tenantId;

    const anomalies = await dbManager.getActiveAnomalies(tenantId);
    res.json(anomalies);
  } catch (error) {
    debug('Error fetching active anomalies:', error);
    // Return 503 for connection-related errors, 500 for other errors
    if (isConnectionError(error)) {
      res.status(503).json({ error: 'Database connection error' });
    } else {
      res.status(500).json({ error: 'Failed to fetch active anomalies' });
    }
  }
});

// GET /api/anomalies/history - Get all anomalies
router.get('/history', async (req, res) => {
  try {
    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const tenantId = (req as any).user?.tenantId;

    const anomalies = await dbManager.getAnomalies(tenantId);
    res.json(anomalies);
  } catch (error) {
    debug('Error fetching anomaly history:', error);
    // Return 503 for connection-related errors, 500 for other errors
    if (isConnectionError(error)) {
      res.status(503).json({ error: 'Database connection error' });
    } else {
      res.status(500).json({ error: 'Failed to fetch anomaly history' });
    }
  }
});

// POST /api/anomalies/:id/resolve - Resolve an anomaly
router.post('/:id/resolve', async (req, res) => {
  try {
    const service = AnomalyDetectionService.getInstance();
    const success = await service.resolveAnomaly(req.params.id);

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Anomaly not found' });
    }
  } catch (error) {
    debug('Error resolving anomaly:', error);
    res.status(500).json({ error: 'Failed to resolve anomaly' });
  }
});

export default router;
