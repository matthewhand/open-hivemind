import Debug from 'debug';
import { Router, type Response } from 'express';
import { param, query } from 'express-validator';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { RealTimeValidationService } from '../../services/RealTimeValidationService';
import { getErrorResponse, handleValidationErrors, validateSubscription } from './middleware';

const debug = Debug('app:server:routes:validation:realtime');
const router = Router();
const validationService = RealTimeValidationService.getInstance();

/**
 * POST /api/validation/subscribe
 * Subscribe to real-time validation for a configuration
 */
router.post(
  '/api/validation/subscribe',
  validateSubscription,
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { configId, clientId, profileId = 'standard' } = req.body;

      const subscription = validationService.subscribe(configId, clientId, profileId);

      return res.json({
        success: true,
        message: 'Subscribed to validation successfully',
        data: subscription,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to subscribe to validation',
        'VALIDATION_ERROR'
      );

      debug('ERROR:', 'Error in', 'Subscribe to validation endpoint');

    const errorObj = hivemindError as any;
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
      error: errorObj.message,
      code: errorObj.code,
      timestamp: errorObj.timestamp,
      });
    }
  }
);

/**
 * DELETE /api/validation/unsubscribe/:configId/:clientId
 * Unsubscribe from real-time validation
 */
router.delete(
  '/api/validation/unsubscribe/:configId/:clientId',
  param('configId').isInt({ min: 1 }).withMessage('Configuration ID must be a positive integer'),
  param('clientId').trim().notEmpty().withMessage('Client ID is required'),
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { configId, clientId } = req.params;
      const configIdNum = parseInt(configId);

      const success = validationService.unsubscribe(configIdNum, clientId);

      if (success) {
        return res.json({
          success: true,
          message: 'Unsubscribed from validation successfully',
        });
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Subscription not found',
        });
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to unsubscribe from validation',
        'VALIDATION_ERROR'
      );

      debug('ERROR:', 'Error in', 'Unsubscribe from validation endpoint');

    const errorObj = hivemindError as any;
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
      error: errorObj.message,
      code: errorObj.code,
      timestamp: errorObj.timestamp,
      });
    }
  }
);

/**
 * GET /api/validation/history
 * Get validation history
 */
router.get(
  '/api/validation/history',
  query('configId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Configuration ID must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const history = validationService.getValidationHistory(configId, limit);

      return res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to get validation history',
        'VALIDATION_ERROR'
      );

      debug('ERROR:', 'Error in', 'Get validation history endpoint');

    const errorObj = hivemindError as any;
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
      error: errorObj.message,
      code: errorObj.code,
      timestamp: errorObj.timestamp,
      });
    }
  }
);

/**
 * GET /api/validation/statistics
 * Get validation statistics
 */
router.get('/api/validation/statistics', async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const statistics = validationService.getValidationStatistics();

    return res.json({
      success: true,
      data: statistics,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation statistics',
      'VALIDATION_ERROR'
    );

    debug('ERROR:', 'Error in', 'Get validation statistics endpoint');

    const { message, code, timestamp } = getErrorResponse(hivemindError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: message,
      code,
      timestamp,
    });
  }
});

/**
 * WebSocket endpoint for real-time validation updates
 * This would be implemented with a WebSocket library like Socket.io
 */
router.get('/api/validation/ws', (req: AuthMiddlewareRequest, res: Response) => {
  // This is a placeholder for WebSocket implementation
  // In a real implementation, you would set up a WebSocket connection
  return res.json({
    success: false,
    message: 'WebSocket endpoint not implemented yet',
  });
});

export default router;
