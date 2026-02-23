import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { webUIStorage } from '../../storage/webUIStorage';

const router = Router();
const debug = Debug('app:webui:guards');

// GET / - Get all guards
router.get('/', (req: Request, res: Response) => {
  try {
    const guards = webUIStorage.getGuards();
    return res.json({
      success: true,
      data: { guards },
      message: 'Guards retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error retrieving guards:', error);
    debug('Error retrieving guards:', error);
    return res.status(500).json({
      error: 'Failed to retrieve guards',
      message: error.message || 'An error occurred while retrieving guards',
    });
  }
});

// POST / - Update access control guard config
router.post('/', (req: Request, res: Response) => {
  try {
    const accessConfig = req.body;

    // Validation
    if (!accessConfig || typeof accessConfig !== 'object' || Array.isArray(accessConfig)) {
       return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid access configuration',
      });
    }

    // Get existing guards to find the access-control guard
    const guards = webUIStorage.getGuards();
    const accessGuard = guards.find((g: any) => g.id === 'access-control');

    if (!accessGuard) {
        // Should not happen if getGuards initializes defaults, but just in case
        return res.status(404).json({
            error: 'Not found',
            message: 'Access control guard not found',
        });
    }

    // Update the config
    accessGuard.config = {
        ...accessGuard.config,
        ...accessConfig
    };

    // Save the updated guard
    webUIStorage.saveGuard(accessGuard);

    return res.json({
      success: true,
      message: 'Access control saved successfully',
    });

  } catch (error: any) {
    debug('Error saving access control:', error);
    return res.status(500).json({
      error: 'Failed to save access control',
      message: error.message || 'An error occurred while saving access control',
    });
  }
});

// POST /:id/toggle - Toggle guard enabled status
router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Enabled status is required and must be a boolean',
      });
    }

    // Check if guard exists
    const guards = webUIStorage.getGuards();
    const guard = guards.find((g: any) => g.id === id);

    if (!guard) {
        return res.status(404).json({
            error: 'Not found',
            message: `Guard with ID ${id} not found`,
        });
    }

    webUIStorage.toggleGuard(id, enabled);

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
