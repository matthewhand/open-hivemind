import { Router } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';
import providersRouter from './providers';
import serversRouter from './servers';

const router = Router();

// Secure all MCP routes - only admins can manage MCP servers
router.use(authenticate, requireAdmin);

router.use('/', serversRouter);
router.use('/', providersRouter);

export default router;
