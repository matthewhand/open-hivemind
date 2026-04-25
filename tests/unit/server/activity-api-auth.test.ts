import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../../../src/server/middleware/auth';

// Minimal router stub so we don't depend on the real activity implementation
const activityRouter = express.Router();
activityRouter.get('/messages', (_req, res) => res.json({ ok: true, messages: [] }));
activityRouter.get('/summary', (_req, res) => res.json({ ok: true }));
activityRouter.post('/log', express.json(), (_req, res) => res.json({ ok: true }));

describe('POST/GET /api/activity requires authentication', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Replicate registerRoutes.ts line 125 shape
    app.use('/api/activity', authenticateToken, activityRouter);
  });

  it('returns 401 on GET /messages without a token', async () => {
    const res = await request(app).get('/api/activity/messages');
    expect(res.status).toBe(401);
  });

  it('returns 401 on GET /summary without a token', async () => {
    const res = await request(app).get('/api/activity/summary');
    expect(res.status).toBe(401);
  });

  it('returns 401 on POST /log without a token', async () => {
    const res = await request(app)
      .post('/api/activity/log')
      .send({ event: 'test' });
    expect(res.status).toBe(401);
  });

  it('returns 403 on GET /messages with an obviously invalid token', async () => {
    const res = await request(app)
      .get('/api/activity/messages')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(403);
  });
});
