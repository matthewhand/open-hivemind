import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { webUIStorage } from '../../storage/webUIStorage';
import {
  ToggleGuardSchema,
  UpdateAccessControlSchema,
} from '../../validation/schemas/guardsSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ApiResponse } from '../../utils/apiResponse';

const router = Router();
const debug = Debug('app:webui:guards');

// GET / - Get all guards
router.get('/', (req: Request, res: Response) => {
  try {
    const guards = webUIStorage.getGuards();
    return ApiResponse.success(res, { guards }, 'Guards retrieved successfully',);
  } catch (error: unknown) {
    debug('ERROR:', 'Error retrieving guards:', error);
    return ApiResponse.serverError(res, 'Failed to retrieve guards', error.message || 'An error occurred while retrieving guards');
  }
});

// Email validation regex
const _emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// IP address or CIDR notation validation regex
const _ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

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
router.post('/', validateRequest(UpdateAccessControlSchema), (req: Request, res: Response) => {
  try {
    const accessConfig = req.body;

    // Additional IP octet validation (beyond regex)
    if (accessConfig.ips) {
      for (const ip of accessConfig.ips) {
        if (!validateIpOctets(ip)) {
          return ApiResponse.badRequest(res, 'Invalid IP address or CIDR notation in ips array', 'Validation error');
        }
      }
    }

    // Get existing guards to find the access-control guard
    const guards = webUIStorage.getGuards();
    const accessGuard = guards.find((g: Record<string, unknown>) => g.id === 'access-control');

    if (!accessGuard) {
      // Should not happen if getGuards initializes defaults, but just in case
      return ApiResponse.notFound(res, 'Access control guard not found');
    }

    // Update the config with validated data only
    accessGuard.config = {
      type: accessConfig.type,
      users: accessConfig.users || [],
      ips: accessConfig.ips || [],
    };

    // Save the updated guard
    webUIStorage.saveGuard(accessGuard);

    return ApiResponse.success(res, undefined, 'Access control saved successfully',);
  } catch (error: unknown) {
    debug('Error saving access control:', error);
    return ApiResponse.serverError(res, 'Failed to save access control', error.message || 'An error occurred while saving access control');
  }
});

// POST /:id/toggle - Toggle guard enabled status
router.post('/:id/toggle', validateRequest(ToggleGuardSchema), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // Check if guard exists
    const guards = webUIStorage.getGuards();
    const guard = guards.find((g: Record<string, unknown>) => g.id === id);

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
  } catch (error: unknown) {
    debug('Error toggling guard:', error);
    return ApiResponse.serverError(res, 'Failed to toggle guard', error.message || 'An error occurred while toggling guard');
  }
});

export default router;
