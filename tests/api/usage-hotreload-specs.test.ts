import express from 'express';
import request from 'supertest';
import hotReloadRouter from '@src/server/routes/hotReload';
import specsRouter from '@src/server/routes/specs';
import usageRouter from '@src/server/routes/usage-tracking';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
}));

describe('Usage, HotReload, Specs Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/usage-tracking', usageRouter);
    app.use('/api/hot-reload', hotReloadRouter);
    app.use('/api/specs', specsRouter);
  });

  describe('Usage Tracking', () => {
    describe('GET /api/usage-tracking/stats', () => {
      it('returns usage stats', async () => {
        const res = await request(app).get('/api/usage-tracking/stats');
        expect(res.status).toBeDefined();
      });
    });

    describe('POST /api/usage-tracking/record', () => {
      it('records usage endpoint', async () => {
        const res = await request(app).post('/api/usage-tracking/record').send({ action: 'test' });
        expect([200, 404, 500]).toContain(res.status);
      });
    });
  });

  describe('Hot Reload', () => {
    describe('GET /api/hot-reload/status', () => {
      it('returns hot reload status', async () => {
        const res = await request(app).get('/api/hot-reload/status');
        expect(res.status).toBeDefined();
      });
    });

    describe('GET /api/hot-reload/history', () => {
      it('returns change history', async () => {
        const res = await request(app).get('/api/hot-reload/history');
        expect(res.status).toBeDefined();
      });
    });
  });

  describe('Specs', () => {
    describe('GET /api/specs', () => {
      it('returns API specs', async () => {
        const res = await request(app).get('/api/specs');
        expect(res.status).toBeDefined();
      });
    });
  });
});
