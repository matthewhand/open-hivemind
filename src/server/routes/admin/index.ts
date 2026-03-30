import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';
import activityRouter from '../activity';
import agentsRouter from '../agents';
import guardProfilesRouter from '../guardProfiles';
import mcpRouter from '../mcp';
import auditRouter from './audit';
import systemRouter from './system';
import usersRouter from './users';

const router = Router();
const debug = Debug('app:webui:admin');

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply authentication middleware to all admin routes (skip in tests)
if (!isTestEnv) {
  router.use(authenticate, requireAdmin);
}

// Apply rate limiting to configuration endpoints
const rateLimit = require('express-rate-limit').default;
const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });

// Apply rate limiting to sensitive configuration operations
router.use('/', configRateLimit);

// Mount existing sub-routes
router.use('/agents', agentsRouter);
router.use('/mcp', mcpRouter);
router.use('/activity', activityRouter);
router.use('/guard-profiles', guardProfilesRouter);

// Mount the newly split sub-routers
// Map the logic directly to the root of the admin router since the frontend
// calls them without the /users, /system, etc. prefixes.
// We mount them on '/' so paths like /api/admin/llm-providers still work correctly.
router.use('/', auditRouter);
router.use('/', systemRouter);
router.use('/', usersRouter);

export default router;
