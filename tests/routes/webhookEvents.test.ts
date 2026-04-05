import request from 'supertest';
import express from 'express';
import webhookEventsRouter, { recordWebhookEvent } from '../../src/server/routes/webhookEvents';

describe('Webhook Events Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookEventsRouter);
  });

  describe('GET /api/webhooks/events', () => {
    it('should return events list', async () => {
      const res = await request(app).get('/api/webhooks/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('limit');
    });

    it('should return recorded webhook events', async () => {
      // Record a test event
      recordWebhookEvent({
        source: 'discord',
        endpoint: '/webhooks/discord',
        method: 'POST',
        statusCode: 200,
        duration: 150,
        payload: { message: 'test' },
      });

      const res = await request(app).get('/api/webhooks/events');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination with limit', async () => {
      const res = await request(app).get('/api/webhooks/events?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.limit).toBe(5);
    });

    it('should support pagination with page', async () => {
      const res = await request(app).get('/api/webhooks/events?page=2');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
    });
  });

  describe('GET /api/webhooks/events/:id', () => {
    it('should return 404 for non-existent event', async () => {
      const res = await request(app).get('/api/webhooks/events/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });
});
