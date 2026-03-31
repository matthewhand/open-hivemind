import express from 'express';
import request from 'supertest';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import dashboardRouter from '../../src/server/routes/dashboard';

// Mock auth middleware to bypass authentication
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock AnalyticsService
jest.mock('../../src/services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn(),
  },
}));

const mockAnalyticsServiceInstance = {
  getStats: jest.fn().mockReturnValue({
    learningProgress: 50,
    behaviorPatternsCount: 3,
    userSegmentsCount: 2,
    totalMessages: 100,
    totalErrors: 5,
    avgProcessingTime: 500,
    activeBots: 2,
    activeUsers: 10,
  }),
  getBehaviorPatterns: jest.fn().mockReturnValue([
    {
      id: 'pattern-1',
      name: 'Test Pattern',
      description: 'Test',
      frequency: 0.5,
      confidence: 0.8,
      trend: 'stable',
      segments: [],
      recommendedWidgets: [],
      priority: 1,
    },
  ]),
  getUserSegments: jest.fn().mockReturnValue([
    {
      id: 'segment-1',
      name: 'Test Segment',
      description: 'Test',
      criteria: {
        behaviorPatterns: [],
        usageFrequency: 'daily',
        featureUsage: [],
        engagementLevel: 'high',
      },
      characteristics: {
        preferredWidgets: [],
        optimalLayout: 'grid',
        themePreference: 'dark',
        notificationFrequency: 5,
      },
      size: 10,
      confidence: 0.9,
    },
  ]),
  getRecommendations: jest.fn().mockReturnValue([
    {
      id: 'rec-1',
      type: 'widget',
      title: 'Test Recommendation',
      description: 'Test',
      confidence: 0.9,
      impact: 'high',
      reasoning: 'Test reasoning',
    },
  ]),
};

describe('AI Dashboard Routes', () => {
  afterEach(() => {
    (DatabaseManager as any).instance = undefined;
  });

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

  beforeEach(async () => {
    jest.clearAllMocks();
    (DatabaseManager as any).instance = undefined;

    const db = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:',
    });
    await db.connect();

    const { AnalyticsService } = require('../../src/services/AnalyticsService');
    (AnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsServiceInstance);

    app = express();
    app.use(express.json());
    // Mount the dashboard router at /api/dashboard to simulate server.ts
    // The internal routes are /ai/..., so the full path is /api/dashboard/ai/...
    app.use('/api/dashboard', dashboardRouter);
  });

  it('GET /api/dashboard/ai/config returns default configuration', async () => {
    const response = await request(app).get('/api/dashboard/ai/config');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('enabled');
    expect(response.body).toHaveProperty('learningRate');
  });

  it('POST /api/dashboard/ai/config updates configuration', async () => {
    const newConfig = { enabled: false, learningRate: 0.5 };
    const response = await request(app).post('/api/dashboard/ai/config').send(newConfig);

    expect(response.status).toBe(200);
    expect(response.body.enabled).toBe(false);
    expect(response.body.learningRate).toBe(0.5);

    // Verify persistence (in-memory)
    const getResponse = await request(app).get('/api/dashboard/ai/config');
    expect(getResponse.body.enabled).toBe(false);
  });

  it('GET /api/dashboard/ai/stats returns learning stats', async () => {
    const response = await request(app).get('/api/dashboard/ai/stats');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('learningProgress');
  });

  it('GET /api/dashboard/ai/segments returns user segments', async () => {
    const response = await request(app).get('/api/dashboard/ai/segments');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/dashboard/ai/patterns returns behavior patterns', async () => {
    const response = await request(app).get('/api/dashboard/ai/patterns');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/dashboard/ai/recommendations returns recommendations', async () => {
    const response = await request(app).get('/api/dashboard/ai/recommendations');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('POST /api/dashboard/ai/feedback accepts feedback', async () => {
    const feedback = { recommendationId: 'rec-1', feedback: 'liked' };
    const response = await request(app).post('/api/dashboard/ai/feedback').send(feedback);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
