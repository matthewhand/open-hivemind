import Debug from 'debug';
import { Router } from 'express';
import { DatabaseManager } from '../../database/DatabaseManager';
import { AnomalyDetectionService } from '../../services/AnomalyDetectionService';
import type { AuthMiddlewareRequest } from '../../auth/types';

const debug = Debug('app:webui:anomaly');
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

export function createAnomalyRouter(
  anomalyService: AnomalyDetectionService,
  dbManager: DatabaseManager
): Router {
  const router = Router();

  // GET /api/anomalies - Get active anomalies
  router.get('/', async (req, res) => {
    try {
      if (!dbManager.isConnected()) {
        res.status(503).json({ error: 'Database not connected' });
        return;
      }

      // Get tenantId from request user if available (assuming req.user is populated by authenticateToken)
      // The authenticateToken middleware usually populates req.user
      const tenantId = (req as AuthMiddlewareRequest).user?.tenantId;

      const anomalies = await dbManager.getActiveAnomalies(tenantId);
      res.json(anomalies || []);
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
      if (!dbManager.isConnected()) {
        res.status(503).json({ error: 'Database not connected' });
        return;
      }

      const tenantId = (req as AuthMiddlewareRequest).user?.tenantId;

      const anomalies = await dbManager.getAnomalies(tenantId);
      res.json(anomalies || []);
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
      const success = await anomalyService.resolveAnomaly(req.params.id);

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

  return router;
}

// Retain a default export that uses the global instances to avoid breaking any other imports that rely on it.
export default createAnomalyRouter(
  AnomalyDetectionService.getInstance(),
  DatabaseManager.getInstance()
);
