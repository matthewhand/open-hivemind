import express from 'express';
import request from 'supertest';
import botsRouter from '../../src/server/routes/bots';
import templatesRouter from '../../src/server/routes/templates';
import { registerServices } from '../../src/di/registration';
import { BotManager } from '../../src/managers/BotManager';

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

describe('Agent and Template API Integration', () => {
  let app: express.Application;

  beforeAll(async () => {
    process.env.CSRF_SKIP_IN_TEST = 'true';
    registerServices();
    
    // Mock BotManager to return at least one bot
    const mockBotManager = {
      getAllBots: jest.fn().mockResolvedValue([
        { id: '1', name: 'Test Bot', isActive: true, messageProvider: 'discord', llmProvider: 'openai' }
      ]),
      getBotsStatus: jest.fn().mockResolvedValue([{ id: '1', isRunning: true }]),
    };
    jest.spyOn(BotManager, 'getInstance').mockResolvedValue(mockBotManager as any);

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
    app.use('/api/admin/templates', templatesRouter);
  });

  afterAll(() => {
    delete process.env.CSRF_SKIP_IN_TEST;
  });

  it('should list built-in templates from real service', async () => {
    const res = await request(app).get('/api/admin/templates');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.templates)).toBe(true);
  });

  it('should list all agents', async () => {
    const res = await request(app)
      .get('/api/bots')
      .set('Authorization', 'Bearer fake-token-for-admin');
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
