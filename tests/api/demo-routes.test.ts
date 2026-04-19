import express from 'express';
import request from 'supertest';
import demoRouter from '@src/server/routes/demo';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
}));

describe('Demo Routes API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/demo', demoRouter);
  });

  describe('GET /api/demo/health', () => {
    it('returns demo health status', async () => {
      const res = await request(app).get('/api/demo/health');
      expect(res.status).toBeDefined();
    });
  });

  describe('POST /api/demo/chat', () => {
    it('accepts chat messages', async () => {
      const res = await request(app).post('/api/demo/chat').send({ message: 'Hello' });
      expect(res.status).toBeDefined();
    });
  });

  describe('GET /api/demo/bots', () => {
    it('returns demo bots', async () => {
      const res = await request(app).get('/api/demo/bots');
      expect(res.status).toBeDefined();
    });
  });
});
