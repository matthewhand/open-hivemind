import Debug from 'debug';
import { Router } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';

import adminUsersRouter from './adminUsers';
import adminSystemRouter from './adminSystem';
import adminAuditRouter from './adminAudit';
import adminBulkRouter from './adminBulk';

// Sub-routers directly mapped from original admin.ts
import agentsRouter from '../agents';
import guardProfilesRouter from '../guardProfiles';
import mcpRouter from '../mcp';

import { configRateLimit } from './adminCommon';

const router = Router();
const debug = Debug('app:webui:admin');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply authentication middleware to all admin routes (skip in tests)
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

// Apply rate limiting to sensitive configuration operations
router.use('/', configRateLimit);

// Mount top-level sub-routes
router.use('/agents', agentsRouter);
router.use('/mcp', mcpRouter);
router.use('/guard-profiles', guardProfilesRouter);

// Composite routers
router.use('/', adminUsersRouter);
router.use('/', adminSystemRouter);
router.use('/', adminAuditRouter); // Mounts /activity inside it
router.use('/', adminBulkRouter);

export default router;
