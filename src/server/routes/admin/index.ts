import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';
import activityRouter from '../activity';
import agentsRouter from '../agents';
import guardProfilesRouter from '../guardProfiles';
import mcpRouter from '../mcp';
import approvalsRouter from './approvals';
import auditRouter from './audit';
import backupRouter from './backup';
import configRouter from './config';
import llmProvidersRouter from './llmProviders';
import maintenanceRouter from './maintenance';
import mcpServersRouter from './mcpServers';
import messengerProvidersRouter from './messengerProviders';
import monitoringRouter from './monitoring';
import providerHealthRouter from './providerHealth';
import providerTypesRouter from './providerTypes';
import systemInfoRouter from './systemInfo';
import usersRouter from './users';

const router = Router();
const debug = Debug('app:webui:admin');

const isTestEnv = process.env.NODE_ENV === 'test';
const skipAuth = process.env.SKIP_AUTH === 'true';

// Refuse to start in production with auth disabled — a misconfigured .env
// would otherwise make every /api/admin/* endpoint public.
if (skipAuth && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[SECURITY] SKIP_AUTH=true is not permitted when NODE_ENV=production. ' +
      'Remove SKIP_AUTH from production env or set NODE_ENV to a non-production value.'
  );
}

// Apply authentication middleware to all admin routes (unless SKIP_AUTH is set)
if (!skipAuth) {
  router.use(authenticate, requireAdmin);
} else {
  console.warn(
    '[SECURITY] SKIP_AUTH=true — /api/admin/* is unauthenticated. Never use in production.'
  );
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

debug('Mounting admin sub-routers');

// Mount existing sub-routes
router.use('/agents', agentsRouter);
router.use('/mcp', mcpRouter);
router.use('/activity', activityRouter);
router.use('/guard-profiles', guardProfilesRouter);

// Mount the newly split sub-routers
debug('Mounting llmProvidersRouter at /');
router.use('/', llmProvidersRouter);
router.use('/', auditRouter);
router.use('/', approvalsRouter);
router.use('/', monitoringRouter);
router.use('/', backupRouter);
router.use('/', configRouter);
router.use('/', maintenanceRouter);
router.use('/', mcpServersRouter);
router.use('/', messengerProvidersRouter);
router.use('/', providerHealthRouter);
router.use('/', providerTypesRouter);
router.use('/', systemInfoRouter);
router.use('/', usersRouter);

debug('Admin sub-routers mounted');

export default router;
