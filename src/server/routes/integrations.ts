import Debug from 'debug';
import { Router } from 'express';
import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';
import {
  CreateIntegrationSchema,
  IntegrationIdParamSchema,
  UpdateIntegrationSchema,
} from '../../validation/schemas/integrationsSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ApiResponse } from "../utils/ApiResponse";

const log = Debug('app:integrationsRouter');
const router = Router();
const providerManager = ProviderConfigManager.getInstance();

// Middleware: Admin access required for all integration changes
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * GET /api/integrations
 * List all configured provider instances
 */
router.get('/', (req, res) => {
  try {
    const providers = providerManager.getAllProviders();
    // Mask sensitive data? Token/API Key?
    // Frontend needs them to edit? Or we mask them like '****'?
    // Typically editing requires seeing or overwriting.
    // For security, masking is better, but for MVP editing, we send full config?
    // Current assumption: Admin is trusted.

    // Optional: category filter
    const category = req.query.category as 'message' | 'llm' | undefined;
    const filtered = category ? providerManager.getAllProviders(category) : providers;

    return res.json(filtered);
  } catch (err: any) {
    log('Error fetching integrations:', err);
    return ApiResponse.error(res, 'Failed to fetch integrations', 500);
  }
});

/**
 * GET /api/integrations/:id
 * Get single provider instance
 */
router.get('/:id', validateRequest(IntegrationIdParamSchema), (req, res) => {
  const provider = providerManager.getProvider(req.params.id);
  if (!provider) {
    return ApiResponse.error(res, 'Provider not found', 404);
  }
  return res.json(provider);
});

/**
 * POST /api/integrations
 * Create new provider instance
 */
router.post('/', validateRequest(CreateIntegrationSchema), (req, res) => {
  try {
    const { type, category, name, config, enabled } = req.body;

    const newInstance = providerManager.createProvider({
      type,
      category,
      name,
      config: config || {},
      enabled: enabled !== false, // Default true
    });

    log(`Created new ${category} provider: ${name} (${type})`);
    return ApiResponse.success(res, undefined, 201);
  } catch (err: any) {
    log('Error creating integration:', err);
    return ApiResponse.error(res, 'Failed to create integration', 500);
  }
});

/**
 * PUT /api/integrations/:id
 * Update provider instance
 */
router.put('/:id', validateRequest(UpdateIntegrationSchema), (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent changing ID
    delete updates.id;

    const updated = providerManager.updateProvider(id, updates);
    if (!updated) {
      return ApiResponse.error(res, 'Provider not found', 404);
    }

    log(`Updated provider: ${updated.name}`);
    return res.json(updated);
  } catch (err: any) {
    log('Error updating integration:', err);
    return ApiResponse.error(res, 'Failed to update integration', 500);
  }
});

/**
 * DELETE /api/integrations/:id
 * Delete provider instance
 */
router.delete('/:id', validateRequest(IntegrationIdParamSchema), (req, res) => {
  try {
    const success = providerManager.deleteProvider(req.params.id);
    if (!success) {
      return ApiResponse.error(res, 'Provider not found', 404);
    }
    log(`Deleted provider: ${req.params.id}`);
    return res.json({ success: true });
  } catch (err: any) {
    log('Error deleting integration:', err);
    return ApiResponse.error(res, 'Failed to delete integration', 500);
  }
});

export default router;
