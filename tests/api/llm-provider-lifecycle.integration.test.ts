import express from 'express';
import request from 'supertest';
import configRouter from '../../src/server/routes/config';
import { registerServices } from '../../src/di/registration';

// Mock authentication and permissions
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  requirePermission: () => (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next()
}));

describe('LLM Provider API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.CSRF_SKIP_IN_TEST = 'true';
    registerServices();
    app = express();
    app.use(express.json());
    // The profiles routes are actually under /api/config/llm-profiles
    app.use('/api/config', configRouter);
  });

  afterAll(() => {
    delete process.env.CSRF_SKIP_IN_TEST;
  });

  it('should return a list of system LLM profiles', async () => {
    const res = await request(app)
      .get('/api/config/llm-profiles')
      .set('Origin', 'http://localhost:3000');
    
    expect(res.status).toBe(200);
    // Based on src/server/routes/config/providers.ts, it returns { llm: [...] }
    expect(res.body).toHaveProperty('llm');
    expect(Array.isArray(res.body.llm)).toBe(true);
  });

  it('should return 404 for non-existent provider profile', async () => {
    const res = await request(app)
      .get('/api/config/llm-profiles/non-existent-key-999')
      .set('Origin', 'http://localhost:3000');
    // If not found, should return 404
    expect(res.status).toBe(404);
  });
});
