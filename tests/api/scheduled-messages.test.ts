import express from 'express';
import request from 'supertest';
import webhooksRouter from '@src/server/routes/webhooks';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Scheduled Messages API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhooksRouter);
  });

  describe('GET /api/webhooks/scheduled', () => {
    it('returns scheduled messages list', async () => {
      const res = await request(app).get('/api/webhooks/scheduled');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/webhooks/scheduled', () => {
    it('creates a scheduled message', async () => {
      const res = await request(app)
        .post('/api/webhooks/scheduled')
        .send({
          botId: 'test-bot',
          channelId: 'test-channel',
          message: 'Hello!',
          scheduledTime: new Date(Date.now() + 3600000).toISOString(),
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/webhooks/scheduled').send({ botId: 'test' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/webhooks/scheduled/:id', () => {
    it('deletes a scheduled message', async () => {
      const res = await request(app).delete('/api/webhooks/scheduled/test-id');
      expect([200, 404]).toContain(res.status);
    });
  });
});
