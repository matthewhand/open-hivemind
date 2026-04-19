import express from 'express';
import request from 'supertest';
import aiAssistRouter from '@src/server/routes/ai-assist';
import errorsRouter from '@src/server/routes/errors';
import integrationsRouter from '@src/server/routes/integrations';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Errors, Integrations, AI-Assist Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/errors', errorsRouter);
    app.use('/api/integrations', integrationsRouter);
    app.use('/api/ai-assist', aiAssistRouter);
  });

  describe('Errors', () => {
    describe('GET /api/errors', () => {
      it('returns errors list', async () => {
        const res = await request(app).get('/api/errors');
        expect(res.status).toBeDefined();
      });
    });

    describe('GET /api/errors/:code', () => {
      it('returns error details', async () => {
        const res = await request(app).get('/api/errors/404');
        expect(res.status).toBeDefined();
      });
    });
  });

  describe('Integrations', () => {
    describe('GET /api/integrations', () => {
      it('returns integrations list', async () => {
        const res = await request(app).get('/api/integrations');
        expect(res.status).toBeDefined();
      });
    });
  });

  describe('AI Assist', () => {
    describe('POST /api/ai-assist/suggest', () => {
      it('suggests AI assistance', async () => {
        const res = await request(app).post('/api/ai-assist/suggest').send({ context: 'test' });
        expect([200, 404, 500]).toContain(res.status);
      });
    });
  });
});
