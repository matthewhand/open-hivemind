/**
 * Webhooks Routes
 *
 * API endpoints for webhook event management
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/webhooks/events
 * List webhook events
 */
router.get('/events', (_req, res) => {
  res.json({ events: [], count: 0 });
});

/**
 * GET /api/webhooks/events/:id
 * Get a specific webhook event by ID
 */
router.get('/events/:id', (req, res) => {
  res.json({ event: null, id: req.params.id, message: 'Event not found' });
});

export default router;
