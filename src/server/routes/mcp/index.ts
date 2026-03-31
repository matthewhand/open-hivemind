import { Router } from 'express';
import { authenticate, requireAdmin } from '../../../auth/middleware';
import configRouter from './config';
import serversRouter, { getConnectedServers } from './servers';
import toolsRouter from './tools';

const router = Router();

// Secure all MCP routes - only admins can manage MCP servers
router.use(authenticate, requireAdmin);

// Server endpoints (e.g., /api/mcp/servers)
router.use('/servers', serversRouter);

// Tool endpoints (e.g., /api/mcp/servers/:name/tools)
router.use('/servers', toolsRouter);

// Provider config endpoints (e.g., /api/mcp/providers)
router.use('/providers', configRouter);

// General endpoints
router.get('/connected', getConnectedServers);

export default router;
