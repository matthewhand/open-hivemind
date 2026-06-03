import { Router } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';
import providersRouter from './providers';
import serversRouter from './servers';
import toolsRouter from './tools';

const router = Router();

// Secure all MCP routes - only admins can manage MCP servers
router.use(authenticate, requireAdmin);

router.use('/', serversRouter);
router.use('/', providersRouter);
router.use('/', toolsRouter);

export default router;
