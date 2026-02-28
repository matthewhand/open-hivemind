import express from 'express';
import request from 'supertest';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import dashboardRouter from '../../src/server/routes/dashboard';

// Mock auth middleware to bypass authentication
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('AI Dashboard Routes', () => {
  let app: express.Application;

  beforeAll(async () => {
    const db = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:',
    });
    await db.connect();
  });

  afterAll(async () => {
    await DatabaseManager.getInstance().disconnect();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mount the dashboard router at /api/dashboard to simulate server.ts
    // The internal routes are /api/ai/..., so the full path is /api/dashboard/api/ai/...
    app.use('/api/dashboard', dashboardRouter);
  });

  it('GET /api/dashboard/api/ai/config returns default configuration', async () => {
    const response = await request(app).get('/api/dashboard/ai/config');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('enabled');
    expect(response.body).toHaveProperty('learningRate');
  });

  it('POST /api/dashboard/api/ai/config updates configuration', async () => {
    const newConfig = { enabled: false, learningRate: 0.5 };
    const response = await request(app).post('/api/dashboard/ai/config').send(newConfig);

    expect(response.status).toBe(200);
    expect(response.body.enabled).toBe(false);
    expect(response.body.learningRate).toBe(0.5);

    // Verify persistence (in-memory)
    const getResponse = await request(app).get('/api/dashboard/ai/config');
    expect(getResponse.body.enabled).toBe(false);
  });

  it('GET /api/dashboard/api/ai/stats returns learning stats', async () => {
    const response = await request(app).get('/api/dashboard/ai/stats');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('learningProgress');
  });

  it('GET /api/dashboard/api/ai/segments returns user segments', async () => {
    const response = await request(app).get('/api/dashboard/ai/segments');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/dashboard/api/ai/patterns returns behavior patterns', async () => {
    const response = await request(app).get('/api/dashboard/ai/patterns');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/dashboard/api/ai/recommendations returns recommendations', async () => {
    const response = await request(app).get('/api/dashboard/ai/recommendations');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /api/dashboard/api/ai/feedback accepts feedback', async () => {
    const feedback = { recommendationId: 'rec-1', feedback: 'liked' };
    const response = await request(app).post('/api/dashboard/ai/feedback').send(feedback);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
