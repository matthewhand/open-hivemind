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

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// IP address or CIDR notation validation regex
const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

/**
 * Validate IP address octets are in valid range (0-255)
 */
const validateIpOctets = (ip: string): boolean => {
  const parts = ip.split('/')[0].split('.');
  return parts.every((p) => {
    const num = parseInt(p, 10);
    return num >= 0 && num <= 255;
  });
};

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

    // Validate type field
    if (!['owner', 'users', 'ip'].includes(accessConfig.type)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid access type. Must be owner, users, or ip',
      });
    }

    // Validate users array
    if (accessConfig.users && !Array.isArray(accessConfig.users)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Users must be an array',
      });
    }

    if (accessConfig.users) {
      for (const user of accessConfig.users) {
        if (typeof user !== 'string' || !emailRegex.test(user)) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid email format in users array',
          });
        }
      }
    }

    // Validate ips array
    if (accessConfig.ips && !Array.isArray(accessConfig.ips)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'IPs must be an array',
      });
    }

    if (accessConfig.ips) {
      for (const ip of accessConfig.ips) {
        if (typeof ip !== 'string' || !ipRegex.test(ip) || !validateIpOctets(ip)) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid IP address or CIDR notation in ips array',
          });
        }
      }
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

    // Update the config with validated data only
    accessGuard.config = {
      type: accessConfig.type,
      users: accessConfig.users || [],
      ips: accessConfig.ips || [],
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
