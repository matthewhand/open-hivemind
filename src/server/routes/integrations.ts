import Debug from 'debug';
import { Router } from 'express';
import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { configLimiter } from '@src/middleware/rateLimiter';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HTTP_STATUS } from '../../types/constants';
import {
  CreateIntegrationSchema,
  IntegrationIdParamSchema,
  UpdateIntegrationSchema,
} from '../../validation/schemas/integrationsSchema';
import { validateRequest } from '../../validation/validateRequest';

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
router.get('/', asyncErrorHandler(async (req, res) => {
  const providers = providerManager.getAllProviders();
  const category = req.query.category as 'message' | 'llm' | undefined;
  const filtered = category ? providerManager.getAllProviders(category) : providers;
  return res.json(ApiResponse.success(filtered));
}));

/**
 * GET /api/integrations/:id
 * Get single provider instance
 */
router.get('/:id', validateRequest(IntegrationIdParamSchema), (req, res) => {
  const provider = providerManager.getProvider(req.params.id);
  if (!provider) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
  }
  return res.json(ApiResponse.success(provider));
});

/**
 * POST /api/integrations
 * Create new provider instance
 */
router.post('/', configLimiter, validateRequest(CreateIntegrationSchema), asyncErrorHandler(async (req, res) => {
  const { type, category, name, config, enabled } = req.body;
  const newInstance = providerManager.createProvider({
    type, category, name,
    config: config || {},
    enabled: enabled !== false,
  });
  log(`Created new ${category} provider: ${name} (${type})`);
  return res.status(HTTP_STATUS.CREATED).json(newInstance);
}));

/**
 * PUT /api/integrations/:id
 * Update provider instance
 */
router.put('/:id', configLimiter, validateRequest(UpdateIntegrationSchema), asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id;
  const updated = providerManager.updateProvider(id, updates);
  if (!updated) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
  }
  log(`Updated provider: ${updated.name}`);
  return res.json(ApiResponse.success(updated));
}));

/**
 * DELETE /api/integrations/:id
 * Delete provider instance
 */
router.delete('/:id', configLimiter, validateRequest(IntegrationIdParamSchema), asyncErrorHandler(async (req, res) => {
  const success = providerManager.deleteProvider(req.params.id);
  if (!success) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
  }
  log(`Deleted provider: ${req.params.id}`);
  return res.json(ApiResponse.success());
}));

export default router;
