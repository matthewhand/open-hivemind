import { Router, type Request, type Response } from 'express';
import { providerRegistry } from '../../registries/ProviderRegistry';
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

/**
 * GET /api/providers/memory
 * List all registered memory providers with status.
 */
router.get('/memory', async (_req: Request, res: Response) => {
  try {
    const memoryProviders = providerRegistry.getMemoryProviders();
    const results: Array<{
      name: string;
      id: string;
      label: string;
      status: 'active' | 'unknown';
    }> = [];

    for (const [name, provider] of memoryProviders) {
      results.push({
        name,
        id: provider.id,
        label: provider.label,
        status: 'active',
      });
    }

    return res.json({
      count: results.length,
      providers: results,
    });
  } catch (err: any) {
    return ApiResponse.error(res, 'Failed to retrieve memory providers', 500, undefined, { message: err.message });
  }
});

/**
 * GET /api/providers/tool
 * List all registered tool providers with status.
 */
router.get('/tool', async (_req: Request, res: Response) => {
  try {
    const toolProviders = providerRegistry.getToolProviders();
    const results: Array<{
      name: string;
      id: string;
      label: string;
      status: 'active' | 'unhealthy' | 'unknown';
      details?: string;
    }> = [];

    for (const [name, provider] of toolProviders) {
      let status: 'active' | 'unhealthy' | 'unknown' = 'active';
      let details: string | undefined;

      // If the provider implements healthCheck, use it
      if (typeof provider.healthCheck === 'function') {
        try {
          const health = await provider.healthCheck();
          status = health.healthy ? 'active' : 'unhealthy';
          details = health.details;
        } catch {
          status = 'unknown';
          details = 'Health check failed';
        }
      }

      results.push({
        name,
        id: provider.id,
        label: provider.label,
        status,
        details,
      });
    }

    return res.json({
      count: results.length,
      providers: results,
    });
  } catch (err: any) {
    return ApiResponse.error(res, 'Failed to retrieve tool providers', 500, undefined, { message: err.message });
  }
});

export default router;
