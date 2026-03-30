import { body } from 'express-validator';

/**
 * Validation middleware for rule creation
 */
export const validateRuleCreation = [
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

  body('severity').trim().isIn(['error', 'warning', 'info']).withMessage('Invalid rule severity'),
];

/**
 * Validation middleware for profile creation
 */
export const validateProfileCreation = [
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
      if (!Array.isArray(value)) {
        return false;
      }
      return value.every((id) => typeof id === 'string');
    })
    .withMessage('Rule IDs must be an array of strings'),

  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean'),
];

/**
 * Validation middleware for configuration validation
 */
export const validateConfigurationValidation = [
  body('configId').isInt({ min: 1 }).withMessage('Configuration ID must be a positive integer'),

  body('profileId')
    .optional()
    .trim()
    .isIn(['strict', 'standard', 'quick'])
    .withMessage('Invalid profile ID'),

  body('clientId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Client ID must be less than 100 characters'),
];

/**
 * Validation middleware for configuration data validation
 */
export const validateConfigurationData = [
  body('configData').isObject().withMessage('Configuration data must be an object'),

  body('profileId')
    .optional()
    .trim()
    .isIn(['strict', 'standard', 'quick'])
    .withMessage('Invalid profile ID'),
];

/**
 * Validation middleware for subscription
 */
export const validateSubscription = [
  body('configId').isInt({ min: 1 }).withMessage('Configuration ID must be a positive integer'),

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
    .withMessage('Invalid profile ID'),
];
