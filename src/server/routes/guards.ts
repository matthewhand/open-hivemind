import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { webUIStorage } from '../../storage/webUIStorage';
import { HTTP_STATUS } from '../../types/constants';
import {
  ToggleGuardSchema,
  UpdateAccessControlSchema,
} from '../../validation/schemas/guardsSchema';
import { validateRequest } from '../../validation/validateRequest';
import { asyncErrorHandler } from '../../middleware/errorHandler';

const router = Router();
const debug = Debug('app:webui:guards');

// GET / - Get all guards
router.get('/', (req: Request, res: Response) => {
  try {
    const guards = webUIStorage.getGuards();
    return res.json(ApiResponse.success({ guards }));
  } catch (error: unknown) {
    debug('ERROR:', 'Error retrieving guards:', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve guards'));
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
router.post(
  '/',
  validateRequest(UpdateAccessControlSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const accessConfig = req.body;

      // Additional IP octet validation (beyond regex)
      if (accessConfig.ips) {
        for (const ip of accessConfig.ips) {
          if (!validateIpOctets(ip)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Validation error'));
          }
        }
      }

      // Get existing guards to find the access-control guard
      const guards = await webUIStorage.getGuards();
      const accessGuard = guards.find((g: Record<string, unknown>) => g.id === 'access-control');

      if (!accessGuard) {
        // Should not happen if getGuards initializes defaults, but just in case
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Not found'));
      }

      // Update the config with validated data only
      accessGuard.config = {
        type: accessConfig.type,
        users: accessConfig.users || [],
        ips: accessConfig.ips || [],
      };

      // Save the updated guard
      await webUIStorage.saveGuard(accessGuard);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      debug('Error saving access control:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to save access control'));
    }
  })
);

// POST /:id/toggle - Toggle guard enabled status
router.post(
  '/:id/toggle',
  validateRequest(ToggleGuardSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      // Check if guard exists
      const guards = await webUIStorage.getGuards();
      const guard = guards.find((g: Record<string, unknown>) => g.id === id);

      if (!guard) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Not found'));
      }

      await webUIStorage.toggleGuard(id, enabled);

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      debug('Error toggling guard:', error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to toggle guard'));
    }
  })
);

export default router;
