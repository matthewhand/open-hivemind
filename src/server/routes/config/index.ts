import { Router } from 'express';
import { auditMiddleware } from '../../middleware/audit';

import uiRouter from './ui';
import systemRouter from './system';
import providersRouter from './providers';

// We also need to export the reloadGlobalConfigs function since it was imported from the main server index/etc.
export { reloadGlobalConfigs } from './shared';

const router = Router();

// Apply audit middleware to all config routes (except in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

router.use('/', uiRouter);
router.use('/', systemRouter);
router.use('/', providersRouter);

export default router;
