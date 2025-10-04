import { Router, Request, Response } from 'express';
import { RealTimeValidationService } from '../services/RealTimeValidationService';
import { requireAdmin, authenticate } from '../../auth/middleware';
import { body, query, param } from 'express-validator';
import { validationResult } from 'express-validator';
import { AuthMiddlewareRequest } from '../../auth/types';
import { HivemindError, ErrorUtils } from '../../types/errors';

import type { BotConfig } from '../../types/config';
const router = Router();
const validationService = RealTimeValidationService.getInstance();

/**
 * Validation middleware for rule creation
 */
interface BotValidationResult {
  name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ValidationSummary {
  botValidation: BotValidationResult[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
  isValid: boolean;
}

function validateBotConfiguration(bot: Partial<BotConfig>): BotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = bot.name ?? 'Unnamed bot';

  if (!bot.name) {
    errors.push('Bot name is required');
    errors.push('Name is required');
  }

  if (!bot.messageProvider) {
    errors.push('Message provider is required');
  }

  if (!bot.llmProvider) {
    errors.push('LLM provider is required');
  }

  if (bot.messageProvider === 'discord') {
    if (!bot.discord?.token) {
      errors.push('Discord bot token is required');
    } else if (bot.discord.token.length < 10) {
      warnings.push('Discord token appears to be invalid (too short)');
    }
  }

  if (bot.messageProvider === 'slack') {
    if (!bot.slack?.botToken) {
      errors.push('Slack bot token is required');
    }
    if (!bot.slack?.signingSecret) {
      errors.push('Slack signing secret is required');
    }
  }

  if (bot.llmProvider === 'openai') {
    if (!bot.openai?.apiKey) {
      errors.push('OpenAI API key is required');
    } else if (!bot.openai.apiKey.startsWith('sk-')) {
      warnings.push('OpenAI API key should start with "sk-"');
    }
  }

  return {
    name,
    valid: errors.length === 0 && warnings.length === 0,
    errors,
    warnings
  };
}

const buildRecommendations = (bots: Partial<BotConfig>[]): string[] => {
  const recommendations: string[] = [];

  if (bots.length === 1) {
    recommendations.push('Consider adding multiple message providers for redundancy');
  }

  if (bots.length > 3) {
    recommendations.push('Consider using a load balancer for better performance');
  }

  return recommendations;
};

const evaluateBotConfigurations = (
  bots: Partial<BotConfig>[],
  environmentWarnings: string[] = []
): ValidationSummary => {
  const botValidation = bots.map(validateBotConfiguration);
  const warnings = [
    ...(environmentWarnings ?? []),
    ...botValidation.flatMap(bot => bot.warnings)
  ];
  const errors = botValidation.flatMap(bot => bot.errors);
  const recommendations = buildRecommendations(bots);
  const isValid = botValidation.every(bot => bot.valid) && warnings.length === 0;

  return {
    botValidation,
    errors,
    warnings,
    recommendations,
    isValid
  };
};

const validateRuleCreation = [
  body('id')
    .trim()
    .notEmpty()
    .withMessage('Rule ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Rule ID can only contain letters, numbers, underscores, and hyphens'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Rule name is required')
    .isLength({ max: 100 })
    .withMessage('Rule name must be less than 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Rule description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('category')
    .trim()
    .isIn(['required', 'format', 'business', 'security', 'performance'])
    .withMessage('Invalid rule category'),
  
  body('severity')
    .trim()
    .isIn(['error', 'warning', 'info'])
    .withMessage('Invalid rule severity')
];

/**
 * Validation middleware for profile creation
 */
const validateProfileCreation = [
  body('id')
    .trim()
    .notEmpty()
    .withMessage('Profile ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Profile ID can only contain letters, numbers, underscores, and hyphens'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Profile name is required')
    .isLength({ max: 100 })
    .withMessage('Profile name must be less than 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Profile description is required')
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('ruleIds')
    .isArray()
    .withMessage('Rule IDs must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every(id => typeof id === 'string');
    })
    .withMessage('Rule IDs must be an array of strings'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

/**
 * Validation middleware for configuration validation
 */
const validateConfigurationValidation = [
  body('configId')
    .isInt({ min: 1 })
    .withMessage('Configuration ID must be a positive integer'),
  
  body('profileId')
    .optional()
    .trim()
    .isIn(['strict', 'standard', 'quick'])
    .withMessage('Invalid profile ID'),
  
  body('clientId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Client ID must be less than 100 characters')
];

/**
 * Validation middleware for configuration data validation
 */
const validateConfigurationData = [
  body('configData')
    .isObject()
    .withMessage('Configuration data must be an object'),
  
  body('profileId')
    .optional()
    .trim()
    .isIn(['strict', 'standard', 'quick'])
    .withMessage('Invalid profile ID')
];

/**
 * Validation middleware for subscription
 */
const validateSubscription = [
  body('configId')
    .isInt({ min: 1 })
    .withMessage('Configuration ID must be a positive integer'),
  
  body('clientId')
    .trim()
    .notEmpty()
    .withMessage('Client ID is required')
    .isLength({ max: 100 })
    .withMessage('Client ID must be less than 100 characters'),
  
  body('profileId')
    .optional()
    .trim()
    .isIn(['strict', 'standard', 'quick'])
    .withMessage('Invalid profile ID')
];

/**
 * Error handler middleware
 */
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const hivemindError = ErrorUtils.toHivemindError(
      new Error('Validation failed'),
      'Request validation failed',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Validation error:', hivemindError);

    return res.status(400).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      details: hivemindError.details,
      timestamp: hivemindError.timestamp
    });
  }
  next();
};

/**
 * GET /api/validation
 * Get validation results for current configuration
 */
router.get('/api/validation', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    // Import the BotConfigurationManager to get current configuration
    const { BotConfigurationManager } = await import('../../config/BotConfigurationManager');

    const configManager = BotConfigurationManager.getInstance();
    const bots = configManager.getAllBots() as Partial<BotConfig>[];
    const managerWarnings = configManager.getWarnings() ?? [];

    const summary = evaluateBotConfigurations(bots, managerWarnings);

    const environmentValidation = {
      valid: managerWarnings.length === 0,
      errors: [] as string[],
      warnings: managerWarnings
    };

    res.json({
      isValid: summary.isValid,
      warnings: summary.warnings,
      errors: summary.errors,
      recommendations: summary.recommendations,
      botValidation: summary.botValidation,
      environmentValidation,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to validate configuration',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Configuration validation endpoint');

    res.status(500).json({
      error: hivemindError.message,
      code: hivemindError.code,
      isValid: false,
      warnings: [],
      errors: [hivemindError.message],
      recommendations: [],
      botValidation: [],
      environmentValidation: {
        valid: false,
        errors: ['Internal validation error'],
        warnings: []
      },
      timestamp: hivemindError.timestamp
    });
  }
});

router.post('/api/validation/test', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
  const { config } = req.body ?? {};

  if (!config) {
    return res.status(400).json({
      error: 'Configuration data required'
    });
  }

  if (typeof config !== 'object' || Array.isArray(config)) {
    return res.status(400).json({
      error: 'Configuration data must be an object'
    });
  }

  const bots = (config as { bots?: Partial<BotConfig>[] }).bots;

  if (!Array.isArray(bots)) {
    return res.status(200).json({
      valid: false,
      errors: ['Configuration must include a "bots" array'],
      warnings: [],
      recommendations: [],
      botValidation: [],
      timestamp: new Date().toISOString()
    });
  }

  const summary = evaluateBotConfigurations(bots);

  return res.json({
    valid: summary.isValid,
    errors: summary.errors,
    warnings: summary.warnings,
    recommendations: summary.recommendations,
    botValidation: summary.botValidation,
    timestamp: new Date().toISOString()
  });
});

router.get('/api/validation/schema', authenticate, (_req: AuthMiddlewareRequest, res: Response) => {
  const schema = {
    botConfig: {
      required: ['name', 'messageProvider', 'llmProvider'],
      properties: {
        name: { type: 'string', description: 'Unique bot name' },
        messageProvider: { type: 'string', enum: ['discord', 'slack', 'mattermost', 'webhook'] },
        llmProvider: { type: 'string', enum: ['openai', 'flowise', 'openwebui', 'perplexity', 'replicate', 'n8n', 'openswarm'] },
        discord: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            clientId: { type: 'string' },
            guildId: { type: 'string' }
          }
        },
        slack: {
          type: 'object',
          properties: {
            botToken: { type: 'string' },
            signingSecret: { type: 'string' },
            appToken: { type: 'string' }
          }
        },
        openai: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' },
            model: { type: 'string' }
          }
        }
      }
    }
  };

  try {
    res.json(schema);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation schema',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Validation schema endpoint');

    res
      .status(500)
      .type('application/json')
      .send(JSON.stringify({
        error: hivemindError.message,
        code: hivemindError.code,
        timestamp: hivemindError.timestamp
      }));
  }
});

/**
 * GET /api/validation/rules
 * Get all validation rules
 */
router.get('/api/validation/rules', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const rules = validationService.getAllRules();
    res.json({
      success: true,
      data: rules,
      count: rules.length
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation rules',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Get validation rules endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * GET /api/validation/rules/:ruleId
 * Get a specific validation rule
 */
router.get('/api/validation/rules/:ruleId', authenticate, param('ruleId').trim().notEmpty(), handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = validationService.getRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Validation rule not found'
      });
    }

    res.json({
      success: true,
      data: rule
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation rule',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Get validation rule endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
 }
});

/**
 * POST /api/validation/rules
 * Create a new validation rule
 */
router.post('/api/validation/rules', requireAdmin, validateRuleCreation, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    // Check if rule already exists
    const existingRule = validationService.getRule(req.body.id);
    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: 'Validation rule with this ID already exists'
      });
    }

    // Note: In a real implementation, you would need to handle the validator function
    // For now, we'll just create a placeholder validator
    const rule = {
      ...req.body,
      validator: (config: any) => ({
        isValid: true,
        errors: [],
        warnings: [],
        info: [],
        score: 100
      })
    };

    validationService.addRule(rule);

    res.status(201).json({
      success: true,
      message: 'Validation rule created successfully',
      data: rule
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to create validation rule',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Create validation rule endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * DELETE /api/validation/rules/:ruleId
 * Delete a validation rule
 */
router.delete('/api/validation/rules/:ruleId', requireAdmin, param('ruleId').trim().notEmpty(), handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const success = validationService.removeRule(ruleId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Validation rule deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Validation rule not found'
      });
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to delete validation rule',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Delete validation rule endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * GET /api/validation/profiles
 * Get all validation profiles
 */
router.get('/api/validation/profiles', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const profiles = validationService.getAllProfiles();
    res.json({
      success: true,
      data: profiles,
      count: profiles.length
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation profiles',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Get validation profiles endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * GET /api/validation/profiles/:profileId
 * Get a specific validation profile
 */
router.get('/api/validation/profiles/:profileId', authenticate, param('profileId').trim().notEmpty(), handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const profile = validationService.getProfile(profileId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Validation profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation profile',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Get validation profile endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * POST /api/validation/profiles
 * Create a new validation profile
 */
router.post('/api/validation/profiles', requireAdmin, validateProfileCreation, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const authReq = req as any;
    const createdBy = authReq.user?.username || 'unknown';
    
    // Check if profile already exists
    const existingProfile = validationService.getProfile(req.body.id);
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Validation profile with this ID already exists'
      });
    }

    // Validate that all rule IDs exist
    const allRules = validationService.getAllRules();
    const ruleIds = allRules.map(rule => rule.id);
    const invalidRuleIds = req.body.ruleIds.filter((id: string) => !ruleIds.includes(id));
    
    if (invalidRuleIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid rule IDs: ${invalidRuleIds.join(', ')}`
      });
    }

    const profile = {
      ...req.body,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    validationService.addProfile(profile);

    res.status(201).json({
      success: true,
      message: 'Validation profile created successfully',
      data: profile
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to create validation profile',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Create validation profile endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * DELETE /api/validation/profiles/:profileId
 * Delete a validation profile
 */
router.delete('/api/validation/profiles/:profileId', requireAdmin, param('profileId').trim().notEmpty(), handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const success = validationService.removeProfile(profileId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Validation profile deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Validation profile not found'
      });
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to delete validation profile',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Delete validation profile endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * POST /api/validation/validate
 * Validate a configuration
 */
router.post('/api/validation/validate', authenticate, validateConfigurationValidation, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { configId, profileId = 'standard', clientId } = req.body;
    
    const report = await validationService.validateConfiguration(
      configId,
      profileId,
      clientId
    );

    res.json({
      success: true,
      message: 'Configuration validated successfully',
      data: report
    });
  } catch (error) {
    console.error('Error validating configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate configuration',
      error: (error as any).message
    });
  }
});

/**
 * POST /api/validation/validate-data
 * Validate configuration data directly
 */
router.post('/api/validation/validate-data', authenticate, validateConfigurationData, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { configData, profileId = 'standard' } = req.body;
    
    const result = validationService.validateConfigurationData(
      configData,
      profileId
    );

    res.json({
      success: true,
      message: 'Configuration data validated successfully',
      data: result
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to validate configuration data',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Validate configuration data endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
 }
});

/**
 * POST /api/validation/subscribe
 * Subscribe to real-time validation for a configuration
 */
router.post('/api/validation/subscribe', authenticate, validateSubscription, handleValidationErrors, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const { configId, clientId, profileId = 'standard' } = req.body;
    
    const subscription = validationService.subscribe(
      configId,
      clientId,
      profileId
    );

    res.json({
      success: true,
      message: 'Subscribed to validation successfully',
      data: subscription
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to subscribe to validation',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Subscribe to validation endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * DELETE /api/validation/unsubscribe/:configId/:clientId
 * Unsubscribe from real-time validation
 */
router.delete('/api/validation/unsubscribe/:configId/:clientId', authenticate,
  param('configId').isInt({ min: 1 }).withMessage('Configuration ID must be a positive integer'),
  param('clientId').trim().notEmpty().withMessage('Client ID is required'),
  handleValidationErrors, 
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const { configId, clientId } = req.params;
      const configIdNum = parseInt(configId);
      
      const success = validationService.unsubscribe(configIdNum, clientId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Unsubscribed from validation successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to unsubscribe from validation',
        'VALIDATION_ERROR'
      ) as any;

      console.error('Error in', 'Unsubscribe from validation endpoint');

      res.status(500).json({
        success: false,
        error: hivemindError.message,
        code: hivemindError.code,
        timestamp: hivemindError.timestamp
      });
    }
  }
);

/**
 * GET /api/validation/history
 * Get validation history
 */
router.get('/api/validation/history', authenticate,
  query('configId').optional().isInt({ min: 1 }).withMessage('Configuration ID must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors, 
  async (req: AuthMiddlewareRequest, res: Response) => {
    try {
      const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const history = validationService.getValidationHistory(configId, limit);
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(
        error,
        'Failed to get validation history',
        'VALIDATION_ERROR'
      ) as any;

      console.error('Error in', 'Get validation history endpoint');

      res.status(500).json({
        success: false,
        error: hivemindError.message,
        code: hivemindError.code,
        timestamp: hivemindError.timestamp
      });
    }
  }
);

/**
 * GET /api/validation/statistics
 * Get validation statistics
 */
router.get('/api/validation/statistics', authenticate, async (req: AuthMiddlewareRequest, res: Response) => {
  try {
    const statistics = validationService.getValidationStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(
      error,
      'Failed to get validation statistics',
      'VALIDATION_ERROR'
    ) as any;

    console.error('Error in', 'Get validation statistics endpoint');

    res.status(500).json({
      success: false,
      error: hivemindError.message,
      code: hivemindError.code,
      timestamp: hivemindError.timestamp
    });
  }
});

/**
 * WebSocket endpoint for real-time validation updates
 * This would be implemented with a WebSocket library like Socket.io
 */
router.get('/api/validation/ws', authenticate, (req: AuthMiddlewareRequest, res: Response) => {
  // This is a placeholder for WebSocket implementation
  // In a real implementation, you would set up a WebSocket connection
  res.json({
    success: false,
    message: 'WebSocket endpoint not implemented yet'
  });
});

export default router;
