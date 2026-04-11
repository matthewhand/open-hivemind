import Debug from 'debug';
import { Router, type Response } from 'express';
import { param, query } from 'express-validator';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { RealTimeValidationService } from '../../services/RealTimeValidationService';
import {
  getErrorResponse,
  handleValidationErrors,
  validateConfigurationData,
  validateConfigurationValidation,
  validateSubscription,
} from './middleware';

const debug = Debug('app:server:routes:validation:realtime');

export function createRealtimeRoutes(): Router {
  const router = Router();
  const validationService = RealTimeValidationService.getInstance();

  /**
   * POST /api/validation/validate
   * Validate a configuration
   */
  router.post(
    '/api/validation/validate',
    validateConfigurationValidation,
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { configId, profileId = 'standard', clientId } = req.body;

        const report = await validationService.validateConfiguration(configId, profileId, clientId);

        return res.json({
          success: true,
          message: 'Configuration validated successfully',
          data: report,
        });
      } catch (error: unknown) {
        debug('ERROR:', 'Error validating configuration:', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to validate configuration',
          error: ErrorUtils.getMessage(error as any),
        });
      }
    }
  );

  /**
   * POST /api/validation/validate-data
   * Validate configuration data directly
   */
  router.post(
    '/api/validation/validate-data',
    validateConfigurationData,
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { configData, profileId = 'standard' } = req.body;

        const result = validationService.validateConfigurationData(configData, profileId);

        return res.json({
          success: true,
          message: 'Configuration data validated successfully',
          data: result,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to validate configuration data',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Validate configuration data endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: ErrorUtils.getMessage(hivemindError),
          code: ErrorUtils.getCode(hivemindError) || 'VALIDATION_ERROR',
          timestamp:
            hivemindError instanceof Error && 'timestamp' in hivemindError
              ? (hivemindError as any).timestamp
              : new Date(),
        });
      }
    }
  );

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

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: ErrorUtils.getMessage(hivemindError),
          code: ErrorUtils.getCode(hivemindError) || 'VALIDATION_ERROR',
          timestamp:
            hivemindError instanceof Error && 'timestamp' in hivemindError
              ? (hivemindError as any).timestamp
              : new Date(),
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

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: ErrorUtils.getMessage(hivemindError),
          code: ErrorUtils.getCode(hivemindError) || 'VALIDATION_ERROR',
          timestamp:
            hivemindError instanceof Error && 'timestamp' in hivemindError
              ? (hivemindError as any).timestamp
              : new Date(),
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

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: ErrorUtils.getMessage(hivemindError),
          code: ErrorUtils.getCode(hivemindError) || 'VALIDATION_ERROR',
          timestamp:
            hivemindError instanceof Error && 'timestamp' in hivemindError
              ? (hivemindError as any).timestamp
              : new Date(),
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

  return router;
}
