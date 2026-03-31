import Debug from 'debug';
import { Router, type Response } from 'express';
import { param } from 'express-validator';
import { requireAdmin } from '../../../auth/middleware';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import type { BotConfig } from '../../../types/config';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { ValidationTestSchema } from '../../../validation/schemas/miscSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { RealTimeValidationService } from '../../services/RealTimeValidationService';
import {
  getErrorResponse,
  handleValidationErrors,
  validateConfigurationData,
  validateConfigurationValidation,
  validateProfileCreation,
  validateRuleCreation,
} from './middleware';
import realtimeRouter from './realtime';
import { evaluateBotConfigurations } from './schemas';

const debug = Debug('app:server:routes:validation');
const router = Router();
const validationService = RealTimeValidationService.getInstance();

/**
 * GET /api/validation
 * Get validation results for current configuration
 */
router.get('/api/validation', async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    // Import the BotConfigurationManager to get current configuration
    const { BotConfigurationManager } = await import('../../../config/BotConfigurationManager');

    const configManager = BotConfigurationManager.getInstance();
    const bots = configManager.getAllBots() as Partial<BotConfig>[];
    const managerWarnings = configManager.getWarnings() ?? [];

    const summary = evaluateBotConfigurations(bots, managerWarnings);

    const environmentValidation = {
      valid: managerWarnings.length === 0,
      errors: [] as string[],
      warnings: managerWarnings,
    };

    return res.json({
      isValid: summary.isValid,
      warnings: summary.warnings,
      errors: summary.errors,
      recommendations: summary.recommendations,
      botValidation: summary.botValidation,
      environmentValidation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    debug('ERROR:', 'Error in Configuration validation endpoint:', error);

    // Always use the standardized error message
    const errorMessage = 'Failed to validate configuration';

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: errorMessage,
      code: 'VALIDATION_ERROR',
      isValid: false,
      warnings: [],
      errors: [errorMessage],
      recommendations: [],
      botValidation: [],
      environmentValidation: {
        valid: false,
        errors: ['Internal validation error'],
        warnings: [],
      },
      timestamp: new Date().toISOString(),
    });
  }
});

router.post(
  '/api/validation/test',
  validateRequest(ValidationTestSchema),
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { config } = req.body ?? {};

      if (!config) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Configuration data required',
        });
      }

      if (typeof config !== 'object' || Array.isArray(config)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Configuration data must be an object',
        });
      }

      const bots = (config as { bots?: Partial<BotConfig>[] }).bots;

      if (!Array.isArray(bots)) {
        return res.status(HTTP_STATUS.OK).json({
          valid: false,
          errors: ['Configuration must include a "bots" array'],
          warnings: [],
          recommendations: [],
          botValidation: [],
          timestamp: new Date().toISOString(),
        });
      }

      const summary = evaluateBotConfigurations(bots);

      return res.json({
        valid: summary.isValid,
        errors: summary.errors,
        warnings: summary.warnings,
        recommendations: summary.recommendations,
        botValidation: summary.botValidation,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      debug('Validation summary failed: %s', error.message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
    }
  }
);

router.get('/api/validation/schema', (_req: AuthMiddlewareRequest, res: Response) => {
  const schema = {
    botConfig: {
      required: ['name', 'messageProvider', 'llmProvider'],
      properties: {
        name: { type: 'string', description: 'Unique bot name' },
        messageProvider: { type: 'string', enum: ['discord', 'slack', 'mattermost', 'webhook'] },
        llmProvider: {
          type: 'string',
          enum: [
            'openai',
            'anthropic',
            'flowise',
            'openwebui',
            'perplexity',
            'replicate',
            'n8n',
            'openswarm',
          ],
        },
        discord: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            clientId: { type: 'string' },
            guildId: { type: 'string' },
          },
        },
        slack: {
          type: 'object',
          properties: {
            botToken: { type: 'string' },
            signingSecret: { type: 'string' },
            appToken: { type: 'string' },
          },
        },
        openai: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' },
            model: { type: 'string' },
          },
        },
        anthropic: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' },
            model: { type: 'string' },
            maxTokens: { type: 'number' },
            temperature: { type: 'number' },
          },
        },
      },
    },
  };

  try {
    return res.json(schema);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation schema',
      'VALIDATION_ERROR'
    );

    debug('ERROR:', 'Error in', 'Validation schema endpoint');

    const errorObj = hivemindError as any;
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .type('application/json')
      .send(
        JSON.stringify({
          error: errorObj.message,
          code: errorObj.code,
          timestamp: errorObj.timestamp,
        })
      );
  }
});

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
        error: ErrorUtils.getMessage(error),
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

// Mount realtime router
router.use('/', realtimeRouter);

export default router;
