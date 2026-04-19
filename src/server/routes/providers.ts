import Debug from 'debug';
import { Router } from 'express';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { providerRegistry } from '../../registries/ProviderRegistry';
import { HTTP_STATUS } from '../../types/constants';
import { ApiResponse } from '../utils/apiResponse';
import { loadLlmProfiles, getLlmProfileByKey } from '../../config/llmProfiles';

const debug = Debug('app:providers-route');
const router = Router();

/**
 * GET /api/providers/profiles
 * List all registered LLM profiles.
 */
router.get(
  '/profiles',
  asyncErrorHandler(async (req, res) => {
    try {
      const profiles = loadLlmProfiles().llm;
      return res.json(ApiResponse.success(profiles));
    } catch (err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Failed to retrieve LLM profiles', 'PROVIDER_LIST_ERROR', {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
  })
);

/**
 * GET /api/providers/providers/:key
 * Get a specific LLM profile by key.
 */
router.get(
  '/providers/:key',
  asyncErrorHandler(async (req, res) => {
    try {
      const { key } = req.params;
      const profile = getLlmProfileByKey(key);
      if (!profile) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Provider not found'));
      }
      return res.json(ApiResponse.success(profile));
    } catch (err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Failed to retrieve provider', 'PROVIDER_FETCH_ERROR', {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
  })
);

/**
 * GET /api/providers/memory
 * List all registered memory providers with health status.
 */
router.get(
  '/memory',
  asyncErrorHandler(async (req, res) => {
    try {
      const memoryProviders = providerRegistry.getMemoryProviders();
      const results: Array<{
        name: string;
        id: string;
        label: string;
        status: 'ok' | 'error' | 'unknown';
        details?: Record<string, unknown>;
      }> = [];

      for (const [name, provider] of memoryProviders) {
        let status: 'ok' | 'error' | 'unknown' = 'unknown';
        let details: Record<string, unknown> | undefined;

        if (typeof provider.healthCheck === 'function') {
          try {
            const health = await provider.healthCheck();
            status = health.status;
            details = health.details;
          } catch (err) {
            status = 'error';
            details = { message: err instanceof Error ? err.message : String(err) };
          }
        }

        results.push({
          name,
          id: (provider as any).id,
          label: (provider as any).label,
          status,
          details,
        });
      }

      return res.json(ApiResponse.success({ count: results.length, providers: results }));
    } catch (err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Failed to retrieve memory providers', 'PROVIDER_LIST_ERROR', {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
  })
);

/**
 * POST /api/providers/memory/:name/test
 * Smoke-test a registered memory provider: add → search → get → delete.
 */
router.post(
  '/memory/:name/test',
  asyncErrorHandler(async (req, res) => {
    const { name } = req.params;
    const userId = (req.body?.userId as string) || 'smoke-test';
    const steps: Array<{
      step: string;
      status: 'pass' | 'fail' | 'skip';
      ms: number;
      detail?: unknown;
    }> = [];

    try {
      const memoryProviders = providerRegistry.getMemoryProviders();
      const provider = memoryProviders.get(name);

      if (!provider) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          ApiResponse.error(`Memory provider "${name}" not found`, 'NOT_FOUND', {
            registered: [...memoryProviders.keys()],
          })
        );
      }

      let memoryId: string | undefined;

      // Step 1: Health check
      const t0 = Date.now();
      try {
        const health = await provider.healthCheck();
        steps.push({
          step: 'healthCheck',
          status: health.status === 'ok' ? 'pass' : 'fail',
          ms: Date.now() - t0,
          detail: health,
        });
      } catch (err) {
        steps.push({
          step: 'healthCheck',
          status: 'fail',
          ms: Date.now() - t0,
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      // Step 2: Add memory
      const t1 = Date.now();
      try {
        const entry = await provider.addMemory(
          'Smoke test: my favourite colour is blue.',
          { source: 'smoke-test' },
          { userId, agentId: 'smoke-test-agent' }
        );
        memoryId = entry?.id;
        steps.push({
          step: 'addMemory',
          status: memoryId ? 'pass' : 'fail',
          ms: Date.now() - t1,
          detail: { memoryId, content: entry?.content?.substring(0, 100) },
        });
      } catch (err) {
        steps.push({
          step: 'addMemory',
          status: 'fail',
          ms: Date.now() - t1,
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      // Step 3: Search
      const t2 = Date.now();
      try {
        const searchResult = await provider.searchMemories('What is my favourite colour?', {
          userId,
          limit: 5,
        });
        const found = searchResult?.results?.length ?? 0;
        steps.push({
          step: 'searchMemories',
          status: found > 0 ? 'pass' : 'fail',
          ms: Date.now() - t2,
          detail: { resultCount: found, topResult: searchResult?.results?.[0] },
        });
      } catch (err) {
        steps.push({
          step: 'searchMemories',
          status: 'fail',
          ms: Date.now() - t2,
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      // Step 4: Get by ID
      const t3 = Date.now();
      if (memoryId) {
        try {
          const entry = await provider.getMemory(memoryId);
          steps.push({
            step: 'getMemory',
            status: entry ? 'pass' : 'fail',
            ms: Date.now() - t3,
            detail: entry ? { id: entry.id, content: entry.content?.substring(0, 100) } : null,
          });
        } catch (err) {
          steps.push({
            step: 'getMemory',
            status: 'fail',
            ms: Date.now() - t3,
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        steps.push({ step: 'getMemory', status: 'skip', ms: 0, detail: 'no memoryId from add step' });
      }

      // Step 5: Delete
      const t4 = Date.now();
      if (memoryId) {
        try {
          await provider.deleteMemory(memoryId);
          steps.push({ step: 'deleteMemory', status: 'pass', ms: Date.now() - t4 });
        } catch (err) {
          steps.push({
            step: 'deleteMemory',
            status: 'fail',
            ms: Date.now() - t4,
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        steps.push({ step: 'deleteMemory', status: 'skip', ms: 0, detail: 'no memoryId from add step' });
      }

      const passed = steps.filter((s) => s.status === 'pass').length;
      const failed = steps.filter((s) => s.status === 'fail').length;
      const skipped = steps.filter((s) => s.status === 'skip').length;
      const totalMs = steps.reduce((sum, s) => sum + s.ms, 0);

      return res.json(
        ApiResponse.success({
          provider: name,
          summary: { passed, failed, skipped, totalMs },
          steps,
        })
      );
    } catch (err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Memory provider test failed', 'PROVIDER_TEST_ERROR', {
          message: err instanceof Error ? err.message : String(err),
          steps,
        })
      );
    }
  })
);

/**
 * GET /api/providers/tool
 * List all registered tool providers with status.
 */
router.get(
  '/tool',
  asyncErrorHandler(async (req, res) => {
    try {
      const toolProviders = providerRegistry.getToolProviders();
      const results: any[] = [];
      for (const [name, provider] of toolProviders) {
        let status = 'active';
        let details: any;
        if (typeof provider.healthCheck === 'function') {
          try {
            const health = await provider.healthCheck();
            status = health.status === 'ok' ? 'active' : 'unhealthy';
            details = health.details;
          } catch {
            status = 'unknown';
          }
        }
        results.push({
          name,
          id: (provider as any).id,
          label: (provider as any).label,
          status,
          details,
        });
      }
      return res.json(ApiResponse.success({ count: results.length, providers: results }));
    } catch (err: unknown) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ApiResponse.error('Failed to retrieve tool providers', 'PROVIDER_LIST_ERROR', {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
  })
);

export default router;
