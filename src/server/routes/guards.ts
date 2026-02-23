import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
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
router.post('/', configRateLimit, (req: Request, res: Response) => {
  try {
    const accessConfig = req.body;

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

    // Update the config of the access-control guard
    guards[accessGuardIndex].config = {
      ...guards[accessGuardIndex].config,
      ...accessConfig,
    };

    // Save the updated guard
    webUIStorage.saveGuard(guards[accessGuardIndex]);

    return res.json({
      success: true,
      message: 'Access control configuration saved successfully',
    });
  } catch (error: any) {
    debug('Error saving access control:', error);
    return res.status(500).json({
      error: 'Failed to save access control',
      message: error.message || 'An error occurred while saving access control',
    });
  }
});

// POST /:id/toggle - Toggle guard status
router.post('/:id/toggle', configRateLimit, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Enabled status must be a boolean',
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

    guard.enabled = enabled;
    webUIStorage.saveGuard(guard);

    return res.json({
      success: true,
      message: `Guard ${guard.name} ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error: any) {
    debug('Error toggling guard:', error);
    return res.status(500).json({
      error: 'Failed to toggle guard',
      message: error.message || 'An error occurred while toggling guard',
    });
  }
});

export default router;
