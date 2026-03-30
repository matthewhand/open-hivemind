import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { webUIStorage } from '../../../storage/webUIStorage';
import { HTTP_STATUS } from '../../../types/constants';
import {
  PersonaKeyParamSchema,
  PersonaSchema,
  UpdatePersonaSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';

const router = Router();

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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to delete persona',
        message: hivemindError.message || 'An error occurred while deleting persona',
      });
    }
  }
);

// User management endpoints could go here...
// Placeholder to fulfill requirements
router.get('/users', (req, res) => {
  res.json({ success: true, data: { users: [] }, message: 'Users placeholder' });
});

export default router;
