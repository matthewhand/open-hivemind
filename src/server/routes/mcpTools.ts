/**
 * MCP Tools Routes
 *
 * API endpoints for MCP tool listing and testing
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/mcp-tools/list
 * List available MCP tools
 */
router.get('/list', (_req, res) => {
  res.json({ tools: [], count: 0 });
});

/**
 * GET /api/mcp-tools/test
 * Test MCP tools connectivity
 */
router.get('/test', (_req, res) => {
  res.json({ status: 'ok', message: 'MCP tools endpoint is reachable' });
});

export default router;
