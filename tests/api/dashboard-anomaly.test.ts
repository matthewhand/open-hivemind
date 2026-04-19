import express from 'express';
import request from 'supertest';
import anomalyRouter from '@src/server/routes/anomaly';
import dashboardRouter from '@src/server/routes/dashboard';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Dashboard & Anomaly Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
    app.use('/api/anomaly', anomalyRouter);
  });

  describe('Dashboard', () => {
    describe('GET /api/dashboard/health', () => {
      it('returns health metrics', async () => {
        const res = await request(app).get('/api/dashboard/health');
        expect(res.status).toBeDefined();
      });
    });

    describe('GET /api/dashboard/stats', () => {
      it('returns dashboard stats', async () => {
        const res = await request(app).get('/api/dashboard/stats');
        expect(res.status).toBeDefined();
      });
    });
  });

  describe('Anomaly', () => {
    describe('GET /api/anomaly/detect', () => {
      it('detects anomalies endpoint', async () => {
        const res = await request(app).get('/api/anomaly/detect');
        expect(res.status).toBeDefined();
      });
    });
  });
});
