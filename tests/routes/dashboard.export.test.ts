/**
 * Dashboard Routes Tests
 *
 * Tests the actual dashboard API endpoints: /tips, /config-status,
 * /announcement, /status, and activity filtering.
 *
 * This replaces the old 356-line file that tested `/dashboard/activity/export`
 * and `/dashboard/analytics/export` — endpoints that DO NOT EXIST anywhere in
 * the dashboard router. No export functionality has been implemented.
 *
 * The new tests cover real endpoints that had zero test coverage.
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

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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

describe('Dashboard Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
    mockManagerInstance.getAllBots.mockReturnValue([]);
    mockWsInstance.getBotStats.mockReturnValue({ messageCount: 0, errorCount: 0, errors: [] });
  });

  // ---- GET /dashboard/tips ----

  describe('GET /dashboard/tips', () => {
    it('should return tips array without authentication', async () => {
      const res = await request(app).get('/dashboard/tips');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('tips');
      expect(Array.isArray(res.body.data.tips)).toBe(true);
    });

    it('should return non-empty tips when TIPS.md exists', async () => {
      const res = await request(app).get('/dashboard/tips');

      // TIPS.md exists in the project root
      expect(res.body.data.tips.length).toBeGreaterThan(0);
    });
  });

  // ---- GET /dashboard/config-status ----

  describe('GET /dashboard/config-status', () => {
    it('should return configuration status without authentication', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'bot1', messageProvider: 'discord', llmProvider: 'openai' },
      ]);

      const res = await request(app).get('/dashboard/config-status');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('llmConfigured');
      expect(res.body.data).toHaveProperty('botConfigured');
      expect(res.body.data).toHaveProperty('messengerConfigured');
    });

    it('should report botConfigured=true when bots exist', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'a', messageProvider: 'discord', llmProvider: 'openai' },
        { name: 'b', messageProvider: 'slack', llmProvider: 'flowise' },
      ]);

      const res = await request(app).get('/dashboard/config-status');

      expect(res.body.data.botConfigured).toBe(true);
    });

    it('should report botConfigured=false when no bots configured', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([]);

      const res = await request(app).get('/dashboard/config-status');

      expect(res.body.data.botConfigured).toBe(false);
    });
  });

  // ---- GET /dashboard/announcement ----

  describe('GET /dashboard/announcement', () => {
    it('should return announcement content without authentication', async () => {
      const res = await request(app).get('/dashboard/announcement');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('hasAnnouncement');
      expect(res.body.data).toHaveProperty('content');
    });

    it('should include hasAnnouncement flag as boolean', async () => {
      const res = await request(app).get('/dashboard/announcement');

      expect(typeof res.body.data.hasAnnouncement).toBe('boolean');
    });
  });

  // ---- GET /dashboard/status ----

  describe('GET /dashboard/status', () => {
    it('should return status with bots array when bots are configured', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'status-bot', messageProvider: 'discord', llmProvider: 'openai' },
      ]);

      const res = await request(app).get('/dashboard/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('bots');
      expect(Array.isArray(res.body.data.bots)).toBe(true);
    });

    it('should return correct bot count', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'a', messageProvider: 'discord', llmProvider: 'openai' },
        { name: 'b', messageProvider: 'slack', llmProvider: 'flowise' },
      ]);

      const res = await request(app).get('/dashboard/status');

      expect(res.body.data.bots).toHaveLength(2);
    });

    it('should return empty bots array when no bots configured', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([]);

      const res = await request(app).get('/dashboard/status');

      expect(res.status).toBe(200);
      expect(res.body.data.bots).toEqual([]);
    });

    it('should include uptime in response', async () => {
      mockManagerInstance.getAllBots.mockReturnValue([]);

      const res = await request(app).get('/dashboard/status');

      expect(res.body.data).toHaveProperty('uptime');
      expect(typeof res.body.data.uptime).toBe('number');
    });
  });

  // ---- GET /dashboard/activity ----

  describe('GET /dashboard/activity', () => {
    it('should return activity events with data wrapper', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([
        {
          id: '1',
          botName: 'test-bot',
          provider: 'discord',
          messageType: 'incoming',
          timestamp: new Date().toISOString(),
        },
      ]);

      const res = await request(app).get('/dashboard/activity');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('events');
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });

    it('should support limit query parameter', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity?limit=1');

      expect(res.status).toBe(200);
      expect(mockActivityLoggerInstance.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 1 })
      );
    });

    it('should support bot filter', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity?bot=filtered-bot');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('events');
    });

    it('should return empty events when no activity exists', async () => {
      mockActivityLoggerInstance.getEvents.mockResolvedValue([]);

      const res = await request(app).get('/dashboard/activity');

      expect(res.status).toBe(200);
      expect(res.body.data.events).toEqual([]);
    });

    it('should return 500 when activity logger fails', async () => {
      mockActivityLoggerInstance.getEvents.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/dashboard/activity');

      expect(res.status).toBe(500);
    });
  });
});
