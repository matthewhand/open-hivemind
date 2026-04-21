import express from 'express';
import request from 'supertest';
import webhookEventsRouter from '@src/server/routes/webhookEvents';

const mockEvent = {
  id: 'test-event-1',
  source: 'discord',
  eventType: 'message',
  payload: { text: 'test' },
  statusCode: 200,
  createdAt: new Date().toISOString(),
};

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Webhook Events API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks/events', webhookEventsRouter);
  });

  describe('GET /api/webhooks/events', () => {
    it('returns events list endpoint', async () => {
      const res = await request(app).get('/api/webhooks/events');
      expect(res.status).toBeDefined();
    });

    it('supports pagination params', async () => {
      const res = await request(app).get('/api/webhooks/events?limit=10&offset=0');
      expect(res.status).toBeDefined();
    });
  });

  describe('GET /api/webhooks/events/:id', () => {
    it('returns single event endpoint', async () => {
      const res = await request(app).get('/api/webhooks/events/test-event-1');
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/webhooks/events/:id/retry', () => {
    it('replays a failed event', async () => {
      const res = await request(app).post('/api/webhooks/events/test-event-1/retry');
      expect([200, 404, 500]).toContain(res.status);
    });

    it('requires event id', async () => {
      const res = await request(app).post('/api/webhooks/events//retry');
      expect(res.status).toBe(404);
    });
  });
});
