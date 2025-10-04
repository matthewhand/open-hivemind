import { Router, Request, Response } from 'express';
import { errorLogger } from '../utils/errorLogger';
import { BaseHivemindError } from '../types/errorClasses';

const router = Router();

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
        required: ['message', 'correlationId']
      });
    }

    // Create a structured error object
    const frontendError: BaseHivemindError = {
      name: errorReport.name || 'FrontendError',
      message: errorReport.message,
      stack: errorReport.stack,
      status: errorReport.status || 500,
      code: errorReport.code || 'FRONTEND_ERROR',
      details: {
        ...errorReport.details,
        componentStack: errorReport.componentStack,
        userAgent: errorReport.userAgent,
        url: errorReport.url,
        localStorage: errorReport.localStorage,
        sessionStorage: errorReport.sessionStorage,
        performance: errorReport.performance,
        source: 'frontend'
      },
      correlationId: errorReport.correlationId,
      severity: errorReport.severity || 'high',
      timestamp: errorReport.timestamp || new Date().toISOString()
    };

    // Log the frontend error
    await errorLogger.logError(frontendError, {
      context: 'frontend_error_report',
      additionalData: {
        userAgent: errorReport.userAgent,
        url: errorReport.url,
        componentStack: errorReport.componentStack
      }
    });

    // Return success response
    res.status(200).json({
      success: true,
      correlationId: errorReport.correlationId,
      message: 'Error report received and logged'
    });

  } catch (error) {
    console.error('Failed to process frontend error report:', error);

    // Log the processing error
    await errorLogger.logError(error as Error, {
      context: 'frontend_error_processing',
      correlationId: req.headers['x-correlation-id'] as string
    });

    res.status(500).json({
      error: 'Failed to process error report',
      correlationId: req.headers['x-correlation-id']
    });
  }
});

// Get error statistics (for monitoring)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await errorLogger.getErrorStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get error stats:', error);
    res.status(500).json({ error: 'Failed to retrieve error statistics' });
  }
});

// Get recent errors (for debugging)
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const recentErrors = await errorLogger.getRecentErrors(limit);
    res.json(recentErrors);
  } catch (error) {
    console.error('Failed to get recent errors:', error);
    res.status(500).json({ error: 'Failed to retrieve recent errors' });
  }
});

export default router;