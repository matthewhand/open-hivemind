import request from 'supertest';
import express from 'express';
import usageTrackingRouter from '../../src/server/routes/usage-tracking';
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

describe('Usage Analytics API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.CSRF_SKIP_IN_TEST = 'true';
    registerServices();
    app = express();
    app.use(express.json());
    app.use('/api/usage-tracking', usageTrackingRouter);
  });

  afterAll(() => {
    delete process.env.CSRF_SKIP_IN_TEST;
  });

  it('should return 200 for usage statistics when authenticated', async () => {
    const res = await request(app)
      .get('/api/usage-tracking/stats')
      .set('Authorization', 'Bearer fake-admin-token');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return 200 for tool usage details', async () => {
    const res = await request(app)
      .get('/api/usage-tracking/tools')
      .set('Authorization', 'Bearer fake-admin-token');
    
    expect(res.status).toBe(200);
  });
});
