import express from 'express';
import request from 'supertest';
import dashboardRouter from '../../src/server/routes/dashboard';
import { registerServices } from '../../src/di/registration';
import { WebSocketService } from '../../src/server/services/WebSocketService';

// Mock authentication and permissions
jest.mock('../../src/server/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  requirePermission: () => (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

describe('Dashboard API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    process.env.CSRF_SKIP_IN_TEST = 'true';
    registerServices();
    
    // Mock WebSocketService for the whole suite
    const mockWs = {
      getBotStats: jest.fn().mockReturnValue({ messageCount: 0, errorCount: 0 }),
    };
    WebSocketService.setInstance(mockWs as any);

    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);
  });

  afterAll(() => {
    delete process.env.CSRF_SKIP_IN_TEST;
  });

  it('should return valid JSON for dashboard status when authenticated', async () => {
    const response = await request(app).get('/api/dashboard/status');
    
    // With our mock, this should always be 200
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
  });

  it('should return 404 for unknown dashboard routes', async () => {
    const response = await request(app).get('/api/dashboard/unknown-endpoint');
    expect(response.status).toBe(404);
  });
});
