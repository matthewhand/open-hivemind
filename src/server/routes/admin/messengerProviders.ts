import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { webUIStorage } from '../../../storage/webUIStorage';
import { HTTP_STATUS } from '../../../types/constants';
import {
  MessengerProviderSchema,
  ToggleIdParamSchema,
  ToggleProviderSchema,
  UpdateMessengerProviderSchema,
} from '../../../validation/schemas/adminSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { asyncErrorHandler } from '../../middleware/errorHandler';

const router = Router();

// GET /messenger-providers - Get all messenger providers
router.get('/messenger-providers', (req: Request, res: Response) => {
  try {
    const providers = webUIStorage.getMessengerProviders();
    return res.json({
      success: true,
      data: { providers },
      message: 'Messenger providers retrieved successfully',
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to retrieve messenger providers',
      message: hivemindError.message || 'An error occurred while retrieving messenger providers',
    });
  }
});

/**
 * @openapi
 * /api/admin/messenger-providers:
 *   post:
 *     summary: Create a new messenger provider
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string }
 *               config: { type: object }
 *             required: [name, type, config]
 *     responses:
 *       200:
 *         description: Created messenger provider
 */
router.post(
  '/messenger-providers',
  validateRequest(MessengerProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { name, type, config } = req.body;

      // Sanitize sensitive data
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.token) {
        sanitizedConfig.token = sanitizedConfig.token.substring(0, 3) + '***';
      }
      if (sanitizedConfig.botToken) {
        sanitizedConfig.botToken = sanitizedConfig.botToken.substring(0, 3) + '***';
      }
      if (sanitizedConfig.signingSecret) {
        sanitizedConfig.signingSecret = sanitizedConfig.signingSecret.substring(0, 3) + '***';
      }

      const newProvider = {
        id: `messenger${Date.now()}`,
        name,
        type,
        config: sanitizedConfig,
        isActive: true,
      };

      // Save to persistent storage
      await webUIStorage.saveMessengerProvider(newProvider);

      return res.json({
        success: true,
        data: { provider: newProvider },
        message: 'Messenger provider created successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to create messenger provider',
        message: hivemindError.message || 'An error occurred while creating messenger provider',
      });
    }
  }
);

// PUT /messenger-providers/:id - Update an existing messenger provider
router.put(
  '/messenger-providers/:id',
  validateRequest(UpdateMessengerProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, config } = req.body;

      // Validation
      if (!name || !type || !config) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: 'Name, type, and config are required',
        });
      }

      // Get existing provider to preserve ID and status if needed
      const providers = await webUIStorage.getMessengerProviders();
      const existingProvider = providers.find((p: any) => p.id === id);

      // Sanitize sensitive data
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.token) {
        sanitizedConfig.token = sanitizedConfig.token.substring(0, 3) + '***';
      }
      if (sanitizedConfig.botToken) {
        sanitizedConfig.botToken = sanitizedConfig.botToken.substring(0, 3) + '***';
      }
      if (sanitizedConfig.signingSecret) {
        sanitizedConfig.signingSecret = sanitizedConfig.signingSecret.substring(0, 3) + '***';
      }

      const updatedProvider = {
        id,
        name,
        type,
        config: sanitizedConfig,
        isActive: existingProvider ? existingProvider.isActive : true,
      };

      // Save to persistent storage
      await webUIStorage.saveMessengerProvider(updatedProvider);

      return res.json({
        success: true,
        data: { provider: updatedProvider },
        message: 'Messenger provider updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update messenger provider',
        message: hivemindError.message || 'An error occurred while updating messenger provider',
      });
    }
  }
);

/**
 * @openapi
 * /api/admin/messenger-providers/{id}:
 *   delete:
 *     summary: Delete a messenger provider
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted messenger provider
 */
router.delete(
  '/messenger-providers/:id',
  validateRequest(ToggleIdParamSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Delete from persistent storage
      await webUIStorage.deleteMessengerProvider(id);

      return res.json({
        success: true,
        message: 'Messenger provider deleted successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to delete messenger provider',
        message: hivemindError.message || 'An error occurred while deleting messenger provider',
      });
    }
  }
);

// POST /messenger-providers/:id/toggle - Toggle messenger provider active status
router.post(
  '/messenger-providers/:id/toggle',
  validateRequest(ToggleProviderSchema),
  asyncErrorHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const providers = await webUIStorage.getMessengerProviders();
      const provider = providers.find((p: any) => p.id === id);

      if (provider) {
        provider.isActive = isActive;
        await webUIStorage.saveMessengerProvider(provider);
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Provider not found',
          message: `Messenger provider with ID ${id} not found`,
        });
      }

      return res.json({
        success: true,
        message: 'Messenger provider status updated successfully',
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to update provider status',
        message: hivemindError.message || 'An error occurred while updating provider status',
      });
    }
  }
);

export default router;
