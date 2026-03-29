import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import {
  ToggleIdParamSchema,
  ToggleProviderSchema,
  ToolUsageGuardSchema,
  UpdateToolUsageGuardSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';

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
router.get('/tool-usage-guards', (req: Request, res: Response) => {
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

    return res.json({
      success: true,
      data: { guards },
      message: 'Tool usage guards retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(500).json({
      error: 'Failed to retrieve tool usage guards',
      message: hivemindError.message || 'An error occurred while retrieving tool usage guards',
    });
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
  validateRequest(ToolUsageGuardSchema),
  (req: Request, res: Response) => {
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

      return res.json({
        success: true,
        data: { guard: newGuard },
        message: 'Tool usage guard created successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to create tool usage guard',
        message: hivemindError.message || 'An error occurred while creating tool usage guard',
      });
    }
  }
);

// PUT /tool-usage-guards/:id - Update an existing tool usage guard
router.put(
  '/tool-usage-guards/:id',
  configRateLimit,
  validateRequest(UpdateToolUsageGuardSchema),
  (req: Request, res: Response) => {
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

      return res.json({
        success: true,
        data: { guard: updatedGuard },
        message: 'Tool usage guard updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to update tool usage guard',
        message: hivemindError.message || 'An error occurred while updating tool usage guard',
      });
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
  validateRequest(ToggleIdParamSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // In a real implementation, this would delete from database
      // For now, just return success

      return res.json({
        success: true,
        message: 'Tool usage guard deleted successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to delete tool usage guard',
        message: hivemindError.message || 'An error occurred while deleting tool usage guard',
      });
    }
  }
);

// POST /tool-usage-guards/:id/toggle - Toggle tool usage guard active status
router.post(
  '/tool-usage-guards/:id/toggle',
  configRateLimit,
  validateRequest(ToggleProviderSchema),
  (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      // In a real implementation, this would update in database
      // For now, just return success

      return res.json({
        success: true,
        message: 'Tool usage guard status updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to update guard status',
        message: hivemindError.message || 'An error occurred while updating guard status',
      });
    }
  }
);

// Placeholder for audit log queries
router.get('/audit-logs', (req, res) => {
  res.json({ success: true, data: { logs: [] }, message: 'Audit logs placeholder' });
});

export default router;
