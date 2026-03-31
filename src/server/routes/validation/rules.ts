import { Router, type Response } from 'express';
import { param } from 'express-validator';
import { requireAdmin } from '../../../auth/middleware';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { RealTimeValidationService } from '../../services/RealTimeValidationService';
import { getErrorResponse, handleValidationErrors, validateProfileCreation, validateRuleCreation } from './middleware';
import Debug from 'debug';

const debug = Debug('app:server:routes:validation:rules');

export function createRuleRoutes(): Router {
  const router = Router();
  const validationService = RealTimeValidationService.getInstance();

  /**
   * GET /api/validation/rules
   * Get all validation rules
   */
  router.get('/api/validation/rules', async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const rules = validationService.getAllRules();
      return res.json({
        success: true,
        data: rules,
        count: rules.length,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to get validation rules',
        'VALIDATION_ERROR'
      );

      debug('ERROR:', 'Error in', 'Get validation rules endpoint');

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
   * GET /api/validation/rules/:ruleId
   * Get a specific validation rule
   */
  router.get(
    '/api/validation/rules/:ruleId',
    param('ruleId').trim().notEmpty(),
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { ruleId } = req.params;
        const rule = validationService.getRule(ruleId);

        if (!rule) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Validation rule not found',
          });
        }

        return res.json({
          success: true,
          data: rule,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to get validation rule',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Get validation rule endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  /**
   * POST /api/validation/rules
   * Create a new validation rule
   */
  router.post(
    '/api/validation/rules',
    requireAdmin,
    validateRuleCreation,
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        // Check if rule already exists
        const existingRule = validationService.getRule(req.body.id);
        if (existingRule) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Validation rule with this ID already exists',
          });
        }

        // Note: In a real implementation, you would need to handle the validator function
        // For now, we'll just create a placeholder validator
        const rule = {
          ...req.body,
          validator: (config: unknown) => ({
            isValid: true,
            errors: [],
            warnings: [],
            info: [],
            score: 100,
          }),
        };

        validationService.addRule(rule);

        return res.status(HTTP_STATUS.CREATED).json({
          success: true,
          message: 'Validation rule created successfully',
          data: rule,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to create validation rule',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Create validation rule endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  /**
   * DELETE /api/validation/rules/:ruleId
   * Delete a validation rule
   */
  router.delete(
    '/api/validation/rules/:ruleId',
    requireAdmin,
    param('ruleId').trim().notEmpty(),
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { ruleId } = req.params;
        const success = validationService.removeRule(ruleId);

        if (success) {
          return res.json({
            success: true,
            message: 'Validation rule deleted successfully',
          });
        } else {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Validation rule not found',
          });
        }
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to delete validation rule',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Delete validation rule endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  /**
   * GET /api/validation/profiles
   * Get all validation profiles
   */
  router.get('/api/validation/profiles', async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const profiles = validationService.getAllProfiles();
      return res.json({
        success: true,
        data: profiles,
        count: profiles.length,
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to get validation profiles',
        'VALIDATION_ERROR'
      );

      debug('ERROR:', 'Error in', 'Get validation profiles endpoint');

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
   * GET /api/validation/profiles/:profileId
   * Get a specific validation profile
   */
  router.get(
    '/api/validation/profiles/:profileId',
    param('profileId').trim().notEmpty(),
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { profileId } = req.params;
        const profile = validationService.getProfile(profileId);

        if (!profile) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Validation profile not found',
          });
        }

        return res.json({
          success: true,
          data: profile,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to get validation profile',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Get validation profile endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  /**
   * POST /api/validation/profiles
   * Create a new validation profile
   */
  router.post(
    '/api/validation/profiles',
    requireAdmin,
    validateProfileCreation,
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const createdBy = req.user?.username || 'unknown';

        // Check if profile already exists
        const existingProfile = validationService.getProfile(req.body.id);
        if (existingProfile) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Validation profile with this ID already exists',
          });
        }

        // Validate that all rule IDs exist
        const allRules = validationService.getAllRules();
        const ruleIds = allRules.map((rule) => rule.id);
        const invalidRuleIds = req.body.ruleIds.filter((id: string) => !ruleIds.includes(id));

        if (invalidRuleIds.length > 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Invalid rule IDs: ${invalidRuleIds.join(', ')}`,
          });
        }

        const profile = {
          ...req.body,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        validationService.addProfile(profile);

        return res.status(HTTP_STATUS.CREATED).json({
          success: true,
          message: 'Validation profile created successfully',
          data: profile,
        });
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to create validation profile',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Create validation profile endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  /**
   * DELETE /api/validation/profiles/:profileId
   * Delete a validation profile
   */
  router.delete(
    '/api/validation/profiles/:profileId',
    requireAdmin,
    param('profileId').trim().notEmpty(),
    handleValidationErrors,
    async (req: AuthMiddlewareRequest, res: Response) => {
      try {
        const { profileId } = req.params;
        const success = validationService.removeProfile(profileId);

        if (success) {
          return res.json({
            success: true,
            message: 'Validation profile deleted successfully',
          });
        } else {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Validation profile not found',
          });
        }
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to delete validation profile',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Delete validation profile endpoint');

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: hivemindError.message,
          code: hivemindError.code,
          timestamp: hivemindError.timestamp,
        });
      }
    }
  );

  return router;
}
