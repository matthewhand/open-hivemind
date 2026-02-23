import { Router, type Request, type Response } from 'express';
import { webUIStorage } from '../../storage/webUIStorage';

const router = Router();

// GET / - Get all guards
router.get('/', (req: Request, res: Response) => {
  try {
    const guards = webUIStorage.getGuards();
    return res.json({
      success: true,
      guards,
    });
  } catch (error: any) {
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
    // Basic validation
    if (!accessConfig || typeof accessConfig !== 'object') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid configuration provided',
      });
    }

    const guards = webUIStorage.getGuards();
    const accessGuardIndex = guards.findIndex((g) => g.id === 'access-control');

    if (accessGuardIndex === -1) {
      // Should not happen as loadConfig ensures it exists, but handle just in case
      return res.status(500).json({
        error: 'Internal Error',
        message: 'Access control guard not found',
      });
    }

    const accessGuard = guards[accessGuardIndex];
    accessGuard.config = accessConfig;

    webUIStorage.saveGuard(accessGuard);

    return res.json({
      success: true,
      message: 'Access control saved successfully',
      guard: accessGuard,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to save guards',
      message: error.message || 'An error occurred while saving guards',
    });
  }
});

// POST /:id/toggle - Toggle guard enabled state
router.post('/:id/toggle', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body; // Expecting { enabled: boolean }

    const guards = webUIStorage.getGuards();
    const guard = guards.find((g) => g.id === id);

    if (!guard) {
      return res.status(404).json({
        error: 'Guard not found',
        message: `Guard with ID ${id} not found`,
      });
    }

    // Use provided enabled state or toggle if not provided
    if (typeof enabled === 'boolean') {
      guard.enabled = enabled;
    } else {
      guard.enabled = !guard.enabled;
    }

    webUIStorage.saveGuard(guard);

    return res.json({
      success: true,
      message: `Guard ${guard.name} ${guard.enabled ? 'enabled' : 'disabled'} successfully`,
      guard,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to toggle guard',
      message: error.message || 'An error occurred while toggling guard',
    });
  }
});

// PUT /:id - Update guard configuration
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid configuration provided',
      });
    }

    const guards = webUIStorage.getGuards();
    const guardIndex = guards.findIndex((g) => g.id === id);

    if (guardIndex === -1) {
      return res.status(404).json({
        error: 'Guard not found',
        message: `Guard with ID ${id} not found`,
      });
    }

    const currentGuard = guards[guardIndex];

    // Update fields
    const updatedGuard = {
      ...currentGuard,
      ...updates,
      id: currentGuard.id, // Prevent ID change
      type: currentGuard.type // Prevent type change if deemed immutable, or allow it. Usually ID is the only immutable one.
    };

    webUIStorage.saveGuard(updatedGuard);

    return res.json({
      success: true,
      message: 'Guard updated successfully',
      guard: updatedGuard,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to update guard',
      message: error.message || 'An error occurred while updating guard',
    });
  }
});

export default router;
