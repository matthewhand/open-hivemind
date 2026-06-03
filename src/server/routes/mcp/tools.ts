import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import { MCPFavoritesService } from '../../services/MCPFavoritesService';

const debug = Debug('app:webui:mcp:tools');
const router = Router();

/**
 * GET /api/mcp/tools/favorites
 *
 * Server-side persistence for the MCP Tools page registry preferences
 * (favorites, recently-used, usage counts). The WebUI hydrates from here on
 * load and falls back to localStorage when the request fails.
 */
router.get(
  '/tools/favorites',
  asyncErrorHandler(async (_req, res) => {
    try {
      const service = MCPFavoritesService.getInstance();
      await service.ready();
      return res.json({ success: true, data: service.getAll() });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error fetching MCP favorites:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_FAVORITES_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * PUT /api/mcp/tools/favorites
 *
 * Persist a (partial) update of the registry preferences. Any omitted field is
 * left unchanged so the client can save just the slice that changed.
 */
router.put(
  '/tools/favorites',
  asyncErrorHandler(async (req, res) => {
    try {
      const { favorites, recentlyUsed, usageCounts } = req.body ?? {};
      const service = MCPFavoritesService.getInstance();
      await service.ready();
      const data = await service.setAll({ favorites, recentlyUsed, usageCounts });
      return res.json({ success: true, data });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error saving MCP favorites:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_FAVORITES_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
