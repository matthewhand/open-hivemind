import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { webUIStorage } from '../../../storage/webUIStorage';
import {
  PersonaKeyParamSchema,
  PersonaSchema,
  ToggleIdParamSchema,
  ToggleProviderSchema,
  ToolUsageGuardSchema,
  UpdatePersonaSchema,
  UpdateToolUsageGuardSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { configRateLimit } from './adminCommon';

const router = Router();
const debug = Debug('app:webui:admin:users');

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

/**
 * @openapi
 * /api/admin/personas:
 *   get:
 *     summary: Retrieve personas
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of personas
 */
router.get('/personas', (req: Request, res: Response) => {
  try {
    // Get personas from persistent storage
    const storedPersonas = webUIStorage.getPersonas();

    // Default personas - in a real implementation, these would be stored in a database
    const defaultPersonas = [
      {
        key: 'default',
        name: 'Default Assistant',
        systemPrompt: 'You are a helpful AI assistant.',
      },
      {
        key: 'developer',
        name: 'Developer Assistant',
        systemPrompt: 'You are an expert software developer assistant.',
      },
      {
        key: 'support',
        name: 'Support Agent',
        systemPrompt: 'You are a customer support agent.',
      },
    ];

    // Combine stored and default personas
    const allPersonas = [...storedPersonas, ...defaultPersonas];

    return res.json({
      success: true,
      data: { personas: allPersonas },
      message: 'Personas retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(500).json({
      error: 'Failed to retrieve personas',
      message: hivemindError.message || 'An error occurred while retrieving personas',
    });
  }
});

/**
 * @openapi
 * /api/admin/personas:
 *   post:
 *     summary: Save a new persona
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key: { type: string }
 *               name: { type: string }
 *               systemPrompt: { type: string }
 *             required: [key, name, systemPrompt]
 *     responses:
 *       200:
 *         description: Created persona
 */
router.post('/personas', validateRequest(PersonaSchema), (req: Request, res: Response) => {
  try {
    const { key, name, systemPrompt } = req.body;

    // Save to persistent storage
    webUIStorage.savePersona({ key, name, systemPrompt });

    return res.json({
      success: true,
      message: 'Persona created successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(500).json({
      error: 'Failed to create persona',
      message: hivemindError.message || 'An error occurred while creating persona',
    });
  }
});

// Update an existing persona
router.put(
  '/personas/:key',
  validateRequest(UpdatePersonaSchema),
  (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { name, systemPrompt } = req.body;

      // Save to persistent storage
      webUIStorage.savePersona({ key, name, systemPrompt });

      return res.json({
        success: true,
        message: 'Persona updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to update persona',
        message: hivemindError.message || 'An error occurred while updating persona',
      });
    }
  }
);

// Delete a persona
router.delete(
  '/personas/:key',
  validateRequest(PersonaKeyParamSchema),
  (req: Request, res: Response) => {
    try {
      const { key } = req.params;

      // Delete from persistent storage
      webUIStorage.deletePersona(key);

      return res.json({
        success: true,
        message: 'Persona deleted successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(500).json({
        error: 'Failed to delete persona',
        message: hivemindError.message || 'An error occurred while deleting persona',
      });
    }
  }
);

export default router;
