import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { HTTP_STATUS } from '../../../types/constants';
import {
  ToggleIdParamSchema,
  ToggleProviderSchema,
  ToolUsageGuardSchema,
  UpdateToolUsageGuardSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { asyncErrorHandler } from '../../../middleware/errorHandler';

const router = Router();

const isTestEnv = process.env.NODE_ENV === 'test';
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

/**
 * @openapi
 * /api/admin/tool-usage-guards:
 *   get:
 *     summary: Retrieve tool usage guards
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of tool usage guards
 */
router.get('/tool-usage-guards', asyncErrorHandler(async (req, res) => {
  try {
    // Mock data for tool usage guards
    const guards = [
      {
        id: 'guard1',
        name: 'Owner Only for Summarize',
        toolName: 'summarize',
        guardType: 'owner_only',
        config: { ownerOnly: true },
        isActive: true,
      },
      {
        id: 'guard2',
        name: 'Specific Users for Translate',
        toolName: 'translate',
        guardType: 'user_list',
        config: { allowedUsers: ['user1', 'user2'] },
        isActive: false,
      },
      {
        id: 'guard3',
        name: 'Role-based for Generate',
        toolName: 'generate',
        guardType: 'role_based',
        config: { allowedRoles: ['admin', 'moderator'] },
        isActive: true,
      },
    ];

    return res.json(ApiResponse.success({ guards }));
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to retrieve tool usage guards'));
  }
});

/**
 * @openapi
 * /api/admin/tool-usage-guards:
 *   post:
 *     summary: Create a new tool usage guard
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               toolId: { type: string }
 *               guardType: { type: string, enum: [owner_only, user_list, role_based] }
 *             required: [name, toolId, guardType]
 *     responses:
 *       200:
 *         description: Created tool usage guard
 */
router.post(
  '/tool-usage-guards',
  configRateLimit,
  validateRequest(ToolUsageGuardSchema), asyncErrorHandler(async (req, res) => {
    try {
      const { name, description, toolId, guardType, allowedUsers, allowedRoles, isActive } =
        req.body;

      // In a real implementation, this would save to database
      const newGuard = {
        id: `guard${Date.now()}`,
        name,
        description,
        toolId,
        guardType,
        allowedUsers: allowedUsers || [],
        allowedRoles: allowedRoles || [],
        isActive: isActive !== false,
      };

      return res.json(ApiResponse.success({ guard: newGuard }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to create tool usage guard'));
    }
  }
);

// PUT /tool-usage-guards/:id - Update an existing tool usage guard
router.put(
  '/tool-usage-guards/:id',
  configRateLimit,
  validateRequest(UpdateToolUsageGuardSchema), asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, toolId, guardType, allowedUsers, allowedRoles, isActive } =
        req.body;

      // In a real implementation, this would update in database
      const updatedGuard = {
        id,
        name,
        description,
        toolId,
        guardType,
        allowedUsers: allowedUsers || [],
        allowedRoles: allowedRoles || [],
        isActive: isActive !== false,
      };

      return res.json(ApiResponse.success({ guard: updatedGuard }));
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update tool usage guard'));
    }
  }
);

/**
 * @openapi
 * /api/admin/tool-usage-guards/{id}:
 *   delete:
 *     summary: Delete a tool usage guard
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted tool usage guard
 */
router.delete(
  '/tool-usage-guards/:id',
  configRateLimit,
  validateRequest(ToggleIdParamSchema), asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // In a real implementation, this would delete from database
      // For now, just return success

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to delete tool usage guard'));
    }
  }
);

// POST /tool-usage-guards/:id/toggle - Toggle tool usage guard active status
router.post(
  '/tool-usage-guards/:id/toggle',
  configRateLimit,
  validateRequest(ToggleProviderSchema), asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // In a real implementation, this would update in database
      // For now, just return success

      return res.json(ApiResponse.success());
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error('Failed to update guard status'));
    }
  }
);

// Placeholder for audit log queries
router.get('/audit-logs', asyncErrorHandler(async (req, res) => {
  res.json(ApiResponse.success({ logs: [] }));
});

export default router;
