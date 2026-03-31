import { Router } from 'express';
import systemRouter, { reloadGlobalConfigs } from './system';
import providersRouter from './providers';
import uiRouter from './ui';

const router = Router();

// Mount sub-routers on the root path to preserve the existing API contract:
// - /api/config/global -> mapped to systemRouter
// - /api/config/llm-profiles -> mapped to providersRouter
// etc.

router.use('/', systemRouter);
router.use('/', providersRouter);
router.use('/ui', uiRouter); // Optional: Provide a separate /ui endpoint if desired by UI logic in the future

// Re-export specific helpers needed by other modules (like `src/server/server.ts` or initialization files)
export { reloadGlobalConfigs };

export default router;
