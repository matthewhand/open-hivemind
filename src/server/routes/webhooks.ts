/**
 * Webhooks Routes
 *
 * API endpoints for webhook event and scheduled message management
 */

import Debug from 'debug';
import { Router } from 'express';
import { authenticate, requireRole } from '@src/auth/middleware';
import { configLimiter } from '@src/middleware/rateLimiter';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HTTP_STATUS } from '@src/types/constants';

const debug = Debug('app:webhooks');
const router = Router();

// In-memory store for scheduled messages (would be DB in production)

const scheduledMessages = new Map<string, any>();

// Note: /events, /events/:id and /events/:id/retry are served by
// webhookEventsRouter (src/server/routes/webhookEvents.ts), which is mounted at
// /api/webhooks ahead of this router. It returns the { success, data } contract
// the WebUI (WebhookEventsPage) expects.

// ─── Scheduled Messages ───────────────────────────────────────────────

/**
 * GET /api/webhooks/scheduled
 * List scheduled messages
 */
router.get('/scheduled', configLimiter, authenticate, (req, res) => {
  const messages = Array.from(scheduledMessages.values());
  return res.json(ApiResponse.success({ messages, count: messages.length }));
});

/**
 * GET /api/webhooks/scheduled/:id
 * Get a scheduled message by ID
 */
router.get('/scheduled/:id', configLimiter, authenticate, (req, res) => {
  const message = scheduledMessages.get(req.params.id);
  if (!message) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Scheduled message not found'));
  }
  return res.json(ApiResponse.success(message));
});

/**
 * POST /api/webhooks/scheduled
 * Create a scheduled message
 */
router.post('/scheduled', configLimiter, authenticate, requireRole('admin'), (req, res) => {
  const { botId, channelId, message, scheduledTime } = req.body;
  if (!botId || !channelId || !message || !scheduledTime) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error('Missing required fields'));
  }
  const id = `sched_${Date.now()}`;
  const scheduled = {
    id,
    botId,
    channelId,
    message,
    scheduledTime,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  scheduledMessages.set(id, scheduled);
  debug('Created scheduled message %s', id);
  return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success(scheduled));
});

/**
 * DELETE /api/webhooks/scheduled/:id
 * Delete a scheduled message
 */
router.delete('/scheduled/:id', configLimiter, authenticate, requireRole('admin'), (req, res) => {
  const deleted = scheduledMessages.delete(req.params.id);
  if (!deleted) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Scheduled message not found'));
  }
  debug('Deleted scheduled message %s', req.params.id);
  return res.json(ApiResponse.success({ message: 'Deleted' }));
});

export default router;
