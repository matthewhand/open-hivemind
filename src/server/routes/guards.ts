import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { body, matchedData, validationResult } from 'express-validator';
import { webUIStorage } from '../../storage/webUIStorage';

const router = Router();
const debug = Debug('app:webui:guards');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply rate limiting to configuration endpoints
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

// Valid guard types
const VALID_GUARD_TYPES = ['access', 'rate', 'content', 'permission', 'custom'];

// System-critical guards that cannot be disabled or deleted
const SYSTEM_GUARDS = ['access-control', 'rate-limiter', 'content-filter'];

/**
 * Validation middleware for guard creation/updates
 */
export const validateGuardInput = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Guard name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9_\-\s]+$/)
    .withMessage('Guard name can only contain letters, numbers, spaces, underscores, and hyphens'),

  body('type')
    .optional()
    .isIn(VALID_GUARD_TYPES)
    .withMessage(`Guard type must be one of: ${VALID_GUARD_TYPES.join(', ')}`),

  body('config').optional().isObject().withMessage('Config must be an object'),

  body('config.type')
    .optional()
    .isIn(['users', 'ip', 'roles', 'none'])
    .withMessage('Config type must be one of: users, ip, roles, none'),

  body('config.users').optional().isArray().withMessage('Users must be an array'),

  body('config.users.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('User IDs must be non-empty strings'),

  body('config.ips').optional().isArray().withMessage('IPs must be an array'),

  body('config.ips.*').optional().isIP().withMessage('Invalid IP address format'),

  body('config.roles').optional().isArray().withMessage('Roles must be an array'),

  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
];

/**
 * Handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid input data',
      details: errors.array(),
    });
  }
  next();
};

// GET / - Retrieve all guards
router.get('/', (req: Request, res: Response) => {
  try {
    const guards = webUIStorage.getGuards();
    return res.json({
      success: true,
      guards,
      message: 'Guards retrieved successfully',
    });
  } catch (error: any) {
    debug('Error retrieving guards:', error);
    return res.status(500).json({
      error: 'Failed to retrieve guards',
      message: error.message || 'An error occurred while retrieving guards',
    });
  }
});

// POST / - Update access control configuration
router.post(
  '/',
  configRateLimit,
  validateGuardInput,
  handleValidationErrors,
  (req: Request, res: Response) => {
    try {
      const { name, type, config, enabled, lastUpdated } = req.body;

      // Retrieve current guards
      const guards = webUIStorage.getGuards();
      const accessGuardIndex = guards.findIndex((g: any) => g.id === 'access-control');

      if (accessGuardIndex === -1) {
        // Should not happen as default guards are initialized, but handle it
        return res.status(404).json({
          error: 'Access Control guard not found',
          message: 'The access control guard configuration is missing.',
        });
      }

      // Check for concurrent modification (simple version)
      const currentGuard = guards[accessGuardIndex];
      if (lastUpdated && currentGuard.lastUpdated !== lastUpdated) {
        return res.status(409).json({
          error: 'Concurrent modification',
          message:
            'The guard configuration has been modified by another request. Please refresh and try again.',
        });
      }

      // Build the update from only valid fields
      const configUpdate: Record<string, any> = {};
      if (name !== undefined) configUpdate.name = name;
      if (type !== undefined) configUpdate.type = type;
      if (enabled !== undefined) configUpdate.enabled = enabled;
      if (config !== undefined) configUpdate.config = config;

      // Update the config of the access-control guard
      guards[accessGuardIndex].config = {
        ...guards[accessGuardIndex].config,
        ...configUpdate,
      };

      // Update lastUpdated timestamp
      guards[accessGuardIndex].lastUpdated = new Date().toISOString();

      // Save the updated guard
      webUIStorage.saveGuard(guards[accessGuardIndex]);

      return res.json({
        success: true,
        message: 'Access control configuration saved successfully',
        data: { guard: guards[accessGuardIndex] },
      });
    } catch (error: any) {
      debug('Error saving access control:', error);
      return res.status(500).json({
        error: 'Failed to save access control',
        message: error.message || 'An error occurred while saving access control',
      });
    }
  }
);

// POST /:id/toggle - Toggle guard status
router.post(
  '/:id/toggle',
  configRateLimit,
  [body('enabled').isBoolean().withMessage('Enabled status must be a boolean')],
  handleValidationErrors,
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      // Validate guard ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Guard ID is required',
        });
      }

      // Prevent toggling system-critical guards
      if (SYSTEM_GUARDS.includes(id) && !enabled) {
        return res.status(403).json({
          error: 'Permission denied',
          message: `Cannot disable system-critical guard: ${id}`,
        });
      }

      const guards = webUIStorage.getGuards();
      const guard = guards.find((g: any) => g.id === id);

      if (!guard) {
        return res.status(404).json({
          error: 'Guard not found',
          message: `Guard with ID ${id} not found`,
        });
      }

      // Check if already in desired state
      if (guard.enabled === enabled) {
        return res.status(200).json({
          success: true,
          message: `Guard ${guard.name} is already ${enabled ? 'enabled' : 'disabled'}`,
          data: { guard },
        });
      }

      guard.enabled = enabled;
      guard.lastUpdated = new Date().toISOString();
      webUIStorage.saveGuard(guard);

      return res.json({
        success: true,
        message: `Guard ${guard.name} ${enabled ? 'enabled' : 'disabled'} successfully`,
        data: { guard },
      });
    } catch (error: any) {
      debug('Error toggling guard:', error);
      return res.status(500).json({
        error: 'Failed to toggle guard',
        message: error.message || 'An error occurred while toggling guard',
      });
    }
  }
);

// DELETE /:id - Delete a custom guard
router.delete('/:id', configRateLimit, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate guard ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Guard ID is required',
      });
    }

    // Prevent deletion of system guards
    if (SYSTEM_GUARDS.includes(id)) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `Cannot delete system guard: ${id}. System guards cannot be removed.`,
      });
    }

    const guards = webUIStorage.getGuards();
    const guardIndex = guards.findIndex((g: any) => g.id === id);

    if (guardIndex === -1) {
      return res.status(404).json({
        error: 'Guard not found',
        message: `Guard with ID ${id} not found`,
      });
    }

    const deletedGuard = guards[guardIndex];

    // Remove the guard from the array
    guards.splice(guardIndex, 1);

    // Save the updated guards array
    webUIStorage.saveConfig({ ...webUIStorage.loadConfig(), guards });

    return res.json({
      success: true,
      message: `Guard ${deletedGuard.name} deleted successfully`,
      data: { deletedGuard },
    });
  } catch (error: any) {
    debug('Error deleting guard:', error);
    return res.status(500).json({
      error: 'Failed to delete guard',
      message: error.message || 'An error occurred while deleting guard',
    });
  }
});

// POST / - Create a new custom guard
router.post(
  '/create',
  configRateLimit,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Guard name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Guard name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9_\-\s]+$/)
      .withMessage(
        'Guard name can only contain letters, numbers, spaces, underscores, and hyphens'
      ),

    body('type')
      .trim()
      .notEmpty()
      .withMessage('Guard type is required')
      .isIn(VALID_GUARD_TYPES)
      .withMessage(`Guard type must be one of: ${VALID_GUARD_TYPES.join(', ')}`),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),

    body('config').optional().isObject().withMessage('Config must be an object'),
  ],
  handleValidationErrors,
  (req: Request, res: Response) => {
    try {
      const data = matchedData(req);
      const { name, type, description, config = {} } = data;

      // Generate a unique ID from the name
      const id = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');

      // Check if guard with this ID already exists
      const guards = webUIStorage.getGuards();
      if (guards.some((g: any) => g.id === id)) {
        return res.status(409).json({
          error: 'Conflict',
          message: `A guard with ID '${id}' already exists`,
        });
      }

      // Create the new guard
      const newGuard = {
        id,
        name,
        type,
        description: description || `${name} guard`,
        enabled: true,
        config,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      webUIStorage.saveGuard(newGuard);

      return res.status(201).json({
        success: true,
        message: 'Guard created successfully',
        data: { guard: newGuard },
      });
    } catch (error: any) {
      debug('Error creating guard:', error);
      return res.status(500).json({
        error: 'Failed to create guard',
        message: error.message || 'An error occurred while creating guard',
      });
    }
  }
);

export default router;
