import Debug from 'debug';
import { Router } from 'express';
import { ErrorUtils } from '@src/types/errors';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import { MCPFavoritesService } from '../../services/MCPFavoritesService';
import { MCPToolHistoryService } from '../../services/MCPToolHistoryService';
import { ToolPreferencesService } from '../../services/ToolPreferencesService';

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

/**
 * GET /api/mcp/tools/preferences
 *
 * Per-tool enable/disable preferences keyed by tool id
 * (`serverName-toolName`). The MCP Tools page merges these over the live
 * server list to decide which tools show as enabled.
 */
router.get(
  '/tools/preferences',
  asyncErrorHandler(async (_req, res) => {
    try {
      const service = ToolPreferencesService.getInstance();
      await service.ready();
      return res.json({ success: true, data: service.getAllPreferences() });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error fetching MCP tool preferences:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_TOOL_PREFERENCES_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * GET /api/mcp/tools/history?limit=50
 *
 * Most recent MCP tool execution records (newest first) for the
 * "Execution History" modal on the MCP Tools page.
 */
router.get(
  '/tools/history',
  asyncErrorHandler(async (req, res) => {
    try {
      const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
      const service = MCPToolHistoryService.getInstance();
      await service.ready();
      return res.json({
        success: true,
        data: service.list(Number.isNaN(limit) ? undefined : limit),
      });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error fetching MCP tool history:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_TOOL_HISTORY_FETCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * POST /api/mcp/tools/history
 *
 * Record a tool execution. The WebUI posts this fire-and-forget after every
 * tool run; missing optional fields (id, executedAt, duration) are defaulted.
 */
router.post(
  '/tools/history',
  asyncErrorHandler(async (req, res) => {
    try {
      const { serverName, toolName } = req.body ?? {};
      if (
        typeof serverName !== 'string' ||
        !serverName ||
        typeof toolName !== 'string' ||
        !toolName
      ) {
        return res.status(400).json({
          success: false,
          error: 'serverName and toolName are required',
          code: 'MCP_TOOL_HISTORY_INVALID',
          timestamp: new Date().toISOString(),
        });
      }
      const service = MCPToolHistoryService.getInstance();
      await service.ready();
      const record = await service.add(req.body);
      return res.status(201).json({ success: true, data: record });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error recording MCP tool history:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_TOOL_HISTORY_SAVE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * POST /api/mcp/tools/:id/toggle
 *
 * Enable or disable a tool. Body: { enabled, serverName, toolName }.
 * Persists via ToolPreferencesService so GET /tools/preferences reflects it.
 */
router.post(
  '/tools/:id/toggle',
  asyncErrorHandler(async (req, res) => {
    try {
      const toolId = req.params.id;
      const { enabled, serverName, toolName } = req.body ?? {};
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'enabled (boolean) is required',
          code: 'MCP_TOOL_TOGGLE_INVALID',
          timestamp: new Date().toISOString(),
        });
      }
      if (
        typeof serverName !== 'string' ||
        !serverName ||
        typeof toolName !== 'string' ||
        !toolName
      ) {
        return res.status(400).json({
          success: false,
          error: 'serverName and toolName are required',
          code: 'MCP_TOOL_TOGGLE_INVALID',
          timestamp: new Date().toISOString(),
        });
      }
      const service = ToolPreferencesService.getInstance();
      await service.ready();
      const preference = await service.setToolEnabled(toolId, serverName, toolName, enabled);
      return res.json({ success: true, data: preference });
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      debug('Error toggling MCP tool:', ErrorUtils.getMessage(hivemindError));
      return res.status(ErrorUtils.getStatusCode(hivemindError) || 500).json({
        success: false,
        error: ErrorUtils.getMessage(hivemindError),
        code: ErrorUtils.getCode(hivemindError) || 'MCP_TOOL_TOGGLE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

export default router;
