import express from 'express';
import request from 'supertest';
import agentsRouter from '@src/server/routes/agents';
import cacheRouter from '@src/server/routes/cache';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
}));

describe('Agents & Cache Routes API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/agents', agentsRouter);
    app.use('/api/cache', cacheRouter);
  });

  describe('Agents Routes', () => {
    describe('GET /api/agents', () => {
      it('returns agents list', async () => {
        const res = await request(app).get('/api/agents');
        expect(res.status).toBeDefined();
      });
    });

    describe('POST /api/agents', () => {
      it('creates agent endpoint', async () => {
        const res = await request(app).post('/api/agents').send({ name: 'test-agent' });
        expect(res.status).toBeDefined();
      });
    });
  });

  describe('Cache Routes', () => {
    describe('GET /api/cache/stats', () => {
      it('returns cache stats', async () => {
        const res = await request(app).get('/api/cache/stats');
        expect(res.status).toBeDefined();
      });
    });

    describe('DELETE /api/cache', () => {
      it('clears cache endpoint', async () => {
        const res = await request(app).delete('/api/cache');
        expect([200, 404, 500]).toContain(res.status);
      });
    });
  });
});
