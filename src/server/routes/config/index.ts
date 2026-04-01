import { Router } from 'express';
import { auditMiddleware } from '../../middleware/audit';
import uiRouter from './ui';
import systemRouter from './system';
import providersRouter from './providers';

const router = Router();

// Apply audit middleware to all config routes (except in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

// Mount sub-routers
router.use('/', systemRouter);     // System settings (/ping, /bots, /sources, /global, etc.)
router.use('/', providersRouter);  // Providers/profiles (/llm-profiles, /memory-profiles, etc.)
router.use('/ui', uiRouter);       // Future UI preferences

export default router;

// Export any globals that index.ts or other parts of the app expect to import from routes/config
export { reloadGlobalConfigs } from './store';
