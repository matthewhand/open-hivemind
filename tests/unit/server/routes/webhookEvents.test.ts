/**
 * Contract tests for the webhook events routes consumed by WebhookEventsPage.
 *
 * The WebUI (src/client/src/pages/WebhookEventsPage.tsx) expects:
 *   - GET  /api/webhooks/events          -> { success, data: { items, total, page, limit, totalPages } }
 *   - GET  /api/webhooks/events/:id      -> { success, data: { ...event, payload } }
 *   - POST /api/webhooks/events/:id/retry-> { success, data: { ... } }
 *
 * These tests pin that contract against webhookEventsRouter, which is the router
 * registerRoutes mounts at /api/webhooks.
 */

import express from 'express';
import request from 'supertest';
import webhookEventsRouter, {
  recordWebhookEvent,
} from '../../../../src/server/routes/webhookEvents';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', webhookEventsRouter);
  return app;
}

describe('webhookEvents routes contract', () => {
  const app = buildApp();

  it('GET /events returns the paginated envelope shape the WebUI expects', async () => {
    const recorded = recordWebhookEvent({
      source: 'discord',
      endpoint: '/webhook/discord',
      method: 'POST',
      statusCode: 200,
      duration: 12,
      payload: { hello: 'world' },
    });

    const res = await request(app).get('/api/webhooks/events').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      })
    );

    const item = res.body.data.items.find((e: { id: string }) => e.id === recorded.id);
    expect(item).toBeDefined();
    expect(item).toEqual(
      expect.objectContaining({
        id: recorded.id,
        source: 'discord',
        endpoint: '/webhook/discord',
        method: 'POST',
        statusCode: 200,
        payloadPreview: expect.any(String),
      })
    );
    // List view must NOT leak the full payload.
    expect(item.payload).toBeUndefined();
  });

  it('GET /events supports source + status filtering', async () => {
    recordWebhookEvent({
      source: 'slack',
      endpoint: '/webhook/slack',
      method: 'POST',
      statusCode: 500,
      duration: 5,
      payload: { boom: true },
      error: 'kaboom',
    });

    const res = await request(app)
      .get('/api/webhooks/events?source=slack&status=failed')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    for (const item of res.body.data.items) {
      expect(item.source).toBe('slack');
      expect(item.statusCode).toBeGreaterThanOrEqual(400);
    }
  });

  it('GET /events/:id returns the full event including payload', async () => {
    const recorded = recordWebhookEvent({
      source: 'mattermost',
      endpoint: '/webhook/mattermost',
      method: 'POST',
      statusCode: 200,
      duration: 7,
      payload: { detail: 'value' },
    });

    const res = await request(app)
      .get(`/api/webhooks/events/${recorded.id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(recorded.id);
    expect(res.body.data.payload).toEqual({ detail: 'value' });
  });

  it('GET /events/:id returns 404 for an unknown id', async () => {
    const res = await request(app)
      .get('/api/webhooks/events/does-not-exist')
      .expect(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /events/:id/retry replays a failed event', async () => {
    const failed = recordWebhookEvent({
      source: 'telegram',
      endpoint: '/webhook/telegram',
      method: 'POST',
      statusCode: 502,
      duration: 9,
      payload: { retry: 'me' },
      error: 'bad gateway',
    });

    const res = await request(app)
      .post(`/api/webhooks/events/${failed.id}/retry`)
      .send({})
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.originalId).toBe(failed.id);
    expect(res.body.data.retryId).toBeDefined();
    expect(typeof res.body.data.message).toBe('string');
  });

  it('POST /events/:id/retry rejects retrying a successful event', async () => {
    const ok = recordWebhookEvent({
      source: 'discord',
      endpoint: '/webhook/discord',
      method: 'POST',
      statusCode: 200,
      duration: 3,
      payload: {},
    });

    const res = await request(app)
      .post(`/api/webhooks/events/${ok.id}/retry`)
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
