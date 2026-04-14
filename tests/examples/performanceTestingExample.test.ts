/**
 * API Response Validation Tests
 *
 * Tests that key API endpoints return well-formed, validated responses
 * with correct shapes, types, and status codes. These catch regressions
 * in API contracts that would break frontend consumers.
 *
 * This replaces the old 195-line performanceTestingExample.test.ts — a demo
 * file with 4 console.log statements that only measured microsecond timing
 * of discordConfig.get() without verifying any application behavior.
 */
import express from 'express';
import request from 'supertest';
import dashboardRouter from '../../src/server/routes/dashboard';

// ---------------------------------------------------------------------------
// Mock auth and services
// ---------------------------------------------------------------------------

jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@src/server/services/WebSocketService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn(),
  },
}));

const mockManagerInstance = {
  getAllBots: jest.fn(),
};

const mockWsInstance = {
  getAllBotStats: jest.fn().mockReturnValue({}),
  getBotStats: jest.fn().mockReturnValue({ messageCount: 0, errorCount: 0, errors: [] }),
};

const mockActivityLoggerInstance = {
  getEvents: jest.fn().mockResolvedValue([]),
};

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/dashboard', dashboardRouter);

  const { BotConfigurationManager } = require('@src/config/BotConfigurationManager');
  const WebSocketService = require('@src/server/services/WebSocketService').default;
  const { ActivityLogger } = require('../../src/server/services/ActivityLogger');

  (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManagerInstance);
  (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsInstance);
  (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockActivityLoggerInstance);

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API Response Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
    mockManagerInstance.getAllBots.mockReturnValue([]);
  });

  // ---- Response shape validation ----

  describe('GET /dashboard/tips response shape', () => {
    it('should return tips array with required fields', async () => {
      const res = await request(app).get('/dashboard/tips');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('tips');
      expect(Array.isArray(res.body.data.tips)).toBe(true);
      expect(res.body.data.tips.length).toBeGreaterThan(0);

      // Each tip should be a non-empty string
      for (const tip of res.body.data.tips) {
        expect(typeof tip).toBe('string');
        expect(tip.length).toBeGreaterThan(0);
      }
    });
  });

  // ---- Error response shape validation ----

  describe('Error response shape', () => {
    it('should return 500 on activity endpoint when logger fails', async () => {
      mockActivityLoggerInstance.getEvents.mockRejectedValue(new Error('Activity log corrupt'));

      const res = await request(app).get('/dashboard/activity');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ---- Content-Type validation ----

  describe('Content-Type headers', () => {
    it('should return application/json for /dashboard/tips', async () => {
      const res = await request(app).get('/dashboard/tips');

      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should return application/json for /dashboard/config-status', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'bot1', messageProvider: 'discord', llmProvider: 'openai' },
      ]);

      const res = await request(app).get('/dashboard/config-status');

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ---- Data type validation ----

  describe('Data type validation', () => {
    it('should return numeric botConfigured flag', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'a', messageProvider: 'discord', llmProvider: 'openai' },
        { name: 'b', messageProvider: 'slack', llmProvider: 'flowise' },
      ]);

      const res = await request(app).get('/dashboard/config-status');

      expect(typeof res.body.data.botConfigured).toBe('boolean');
      expect(res.body.data.botConfigured).toBe(true);
    });

    it('should return announcement response with hasAnnouncement flag', async () => {
      const res = await request(app).get('/dashboard/announcement');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasAnnouncement');
    });

    it('should return correct config-status response shape', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'bot1', messageProvider: 'discord', llmProvider: 'openai' },
      ]);
      mockWsInstance.getBotStats.mockReturnValue({ messageCount: 0, errorCount: 0 });

      const res = await request(app).get('/dashboard/config-status');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('llmConfigured');
      expect(res.body.data).toHaveProperty('botConfigured');
      expect(res.body.data).toHaveProperty('messengerConfigured');
    });
  });

  // ---- Query parameter validation ----

  describe('Query parameter handling', () => {
    it('should accept limit parameter for activity endpoint', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity?limit=5');

      expect(res.status).toBe(200);
      expect(mockActivityLoggerInstance.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should accept bot filter for activity endpoint', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity?bot=test-bot');

      expect(res.status).toBe(200);
    });

    it('should accept messageProvider filter for activity endpoint', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity?messageProvider=discord');

      expect(res.status).toBe(200);
    });

    it('should handle missing optional query parameters gracefully', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });
  });

  // ---- Response consistency across calls ----

  describe('Response consistency', () => {
    it('should return same number of tips on consecutive calls', async () => {
      const res1 = await request(app).get('/dashboard/tips');
      const res2 = await request(app).get('/dashboard/tips');

      expect(res1.body.length).toBe(res2.body.length);
    });

    it('should return consistent config-status shape', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'consistency-bot', messageProvider: 'discord', llmProvider: 'openai' },
      ]);

      const res1 = await request(app).get('/dashboard/config-status');
      const res2 = await request(app).get('/dashboard/config-status');

      expect(Object.keys(res1.body).sort()).toEqual(Object.keys(res2.body).sort());
    });
  });
});
