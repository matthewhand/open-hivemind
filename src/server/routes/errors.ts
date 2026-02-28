import { Router, type Request, type Response } from 'express';
import { ErrorFactory } from '../../types/errorClasses';
import { errorLogger } from '../../utils/errorLogger';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Handle CORS preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');
  return res.status(204).send();
});

// Frontend error reporting endpoint
router.post('/frontend', async (req: Request, res: Response) => {
  try {
    const errorReport = req.body as {
      name: string;
      message: string;
      stack?: string;
      status?: number;
      code?: string;
      details?: Record<string, any>;
      correlationId?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      timestamp?: string;
      componentStack?: string;
      userAgent?: string;
      url?: string;
      localStorage?: Record<string, string>;
      sessionStorage?: Record<string, string>;
      performance?: any;
    };

    // Validate required fields
    if (!errorReport.message || !errorReport.correlationId) {
      return res.status(400).json({
        error: 'Invalid error report: missing required fields',
        required: ['message', 'correlationId'],
      });
    }

    // Set correlation ID in response header
    res.setHeader('X-Correlation-ID', errorReport.correlationId);

    // Create a structured error object
    const frontendError = ErrorFactory.createError(new Error(errorReport.message), {
      source: 'frontend',
      componentStack: errorReport.componentStack,
      userAgent: errorReport.userAgent,
      url: errorReport.url,
      localStorage: errorReport.localStorage,
      sessionStorage: errorReport.sessionStorage,
      performance: errorReport.performance,
      ...errorReport.details,
    });

    // Log the frontend error
    await errorLogger.logError(frontendError, {
      correlationId: errorReport.correlationId,
      path: errorReport.url || '/unknown',
      method: 'POST',
      userAgent: errorReport.userAgent,
      body: {
        source: 'frontend',
        componentStack: errorReport.componentStack,
        performance: errorReport.performance,
      },
    });

    // Return success response
    return res.status(200).json({
      success: true,
      correlationId: errorReport.correlationId,
      message: 'Error report received and logged',
    });
  } catch (error) {
    console.error('Failed to process frontend error report:', error);

    // Log the processing error
    await errorLogger.logError(error as Error, {
      correlationId: (req.headers['x-correlation-id'] as string) || 'unknown',
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });

    // Set correlation ID in response header
    const correlationId = (req.headers['x-correlation-id'] as string) || 'unknown';
    res.setHeader('X-Correlation-ID', correlationId);

    return res.status(500).json({
      error: 'Failed to process error report',
      correlationId: correlationId,
    });
  }
});

// Get error statistics (for monitoring)
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stats = await errorLogger.getErrorStats();
    return res.json(stats);
  } catch (error) {
    console.error('Failed to get error stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve error statistics' });
  }
});

// Get recent errors (for debugging)
router.get('/recent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const recentErrors = await errorLogger.getRecentErrors(limit);
    return res.json(recentErrors);
  } catch (error) {
    console.error('Failed to get recent errors:', error);
    return res.status(500).json({ error: 'Failed to retrieve recent errors' });
  }
});

export default router;
