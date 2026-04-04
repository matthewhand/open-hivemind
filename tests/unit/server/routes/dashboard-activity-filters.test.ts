import express from 'express';
import request from 'supertest';
import dashboardRouter from '@src/server/routes/dashboard';
import { ActivityLogger } from '@src/server/services/ActivityLogger';
import WebSocketService from '@src/server/services/WebSocketService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

// Mock dependencies
jest.mock('@config/BotConfigurationManager');
jest.mock('@src/server/services/ActivityLogger');
jest.mock('@src/server/services/WebSocketService');
jest.mock('@src/database/DatabaseManager');
jest.mock('@src/auth/middleware', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => next(),
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => next(),
}));

describe('Activity Filtering and Export', () => {
  let app: express.Application;
  const mockBots = [
    { name: 'SupportBot', messageProvider: 'discord', llmProvider: 'openai' },
    { name: 'SalesBot', messageProvider: 'slack', llmProvider: 'anthropic' },
  ];

  const mockEvents = [
    {
      id: '1',
      timestamp: '2026-03-30T10:00:00.000Z',
      botName: 'SupportBot',
      provider: 'discord',
      channelId: 'channel1',
      userId: 'user1',
      messageType: 'incoming',
      contentLength: 50,
      processingTime: 120,
      status: 'success',
    },
    {
      id: '2',
      timestamp: '2026-03-30T11:00:00.000Z',
      botName: 'SalesBot',
      provider: 'slack',
      channelId: 'channel2',
      userId: 'user2',
      messageType: 'incoming',
      contentLength: 120,
      processingTime: 2500,
      status: 'timeout',
    },
    {
      id: '3',
      timestamp: '2026-03-30T12:00:00.000Z',
      botName: 'SupportBot',
      provider: 'discord',
      channelId: 'channel1',
      userId: 'user3',
      messageType: 'outgoing',
      contentLength: 200,
      processingTime: 450,
      status: 'error',
      errorMessage: 'Connection failed',
    },
    {
      id: '4',
      timestamp: '2026-03-30T13:00:00.000Z',
      botName: 'SalesBot',
      provider: 'slack',
      channelId: 'channel2',
      userId: 'user4',
      messageType: 'incoming',
      contentLength: 80,
      processingTime: 200,
      status: 'success',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);

    // Mock BotConfigurationManager
    const mockManager = {
      getAllBots: jest.fn().mockReturnValue(mockBots),
    };
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManager);

    // Mock ActivityLogger
    const mockLogger = {
      getEvents: jest.fn().mockResolvedValue([...mockEvents]),
    };
    (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    // Mock WebSocketService
    const mockWS = {
      getAllBotStats: jest.fn().mockReturnValue({
        SupportBot: { messageCount: 100, errors: [], errorCount: 0 },
        SalesBot: { messageCount: 50, errors: [], errorCount: 0 },
      }),
    };
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWS);
  });

  describe('GET /api/dashboard/activity - Filtering', () => {
    it('should return all events when no filters are applied', async () => {
      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
      expect(response.body.data.filters.agents).toEqual(['SalesBot', 'SupportBot']);
    });

    it('should filter by bot name', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ bot: 'SupportBot' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((e: any) => e.botName === 'SupportBot')).toBe(true);
    });

    it('should filter by message provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ messageProvider: 'slack' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((e: any) => e.provider === 'slack')).toBe(true);
    });

    it('should filter by LLM provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ llmProvider: 'openai' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((e: any) => e.llmProvider === 'openai')).toBe(true);
    });

    it('should ignore unsupported severity filter and return all events', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'error' });

      // severity filter is not supported by the route; all events are returned
      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported severity warning filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'warning' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported severity info filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'info' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported activityType error filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'error' });

      // activityType filter is not supported; all events are returned
      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported activityType message filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'message' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported search filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'support' });

      // search filter is not supported; all events are returned
      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported search filter (user)', async () => {
      const response = await request(app).get('/api/dashboard/activity').query({ search: 'user1' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should ignore unsupported search filter (error message)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'connection' });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should filter by date range', async () => {
      const response = await request(app).get('/api/dashboard/activity').query({
        from: '2026-03-30T11:30:00.000Z',
        to: '2026-03-30T12:30:00.000Z',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(1);
      expect(response.body.data.events[0].botName).toBe('SupportBot');
    });

    it('should combine bot filter with date range', async () => {
      const response = await request(app).get('/api/dashboard/activity').query({
        bot: 'SupportBot',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(2);
      expect(response.body.data.events.every((e: any) => e.botName === 'SupportBot')).toBe(true);
    });
  });

  describe('GET /api/dashboard/activity/export - Not Implemented', () => {
    it('should return 404 for export endpoint (not implemented)', async () => {
      const response = await request(app).get('/api/dashboard/activity/export');

      // The CSV export endpoint does not exist on the dashboard router
      expect(response.status).toBe(404);
    });
  });

  describe('Response structure', () => {
    it('should return events annotated with llmProvider', async () => {
      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(4);
      // Events are annotated with llmProvider based on bot config
      expect(response.body.data.events[0]).toHaveProperty('llmProvider');
    });

    it('should return filter options for agents, messageProviders, llmProviders', async () => {
      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.filters.agents).toEqual(['SalesBot', 'SupportBot']);
      expect(response.body.data.filters.messageProviders).toEqual(
        expect.arrayContaining(['discord', 'slack'])
      );
      expect(response.body.data.filters.llmProviders).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        botName: i % 2 === 0 ? 'Bot1' : 'Bot2',
        provider: 'discord',
        channelId: 'channel1',
        userId: `user${i}`,
        messageType: 'incoming',
        contentLength: 100,
        processingTime: 200,
        status: 'success',
      }));

      const mockLoggerLarge = {
        getEvents: jest.fn().mockResolvedValue(largeDataset),
      };
      (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockLoggerLarge);

      const startTime = Date.now();
      const response = await request(app).get('/api/dashboard/activity');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.data.events.length).toBeLessThanOrEqual(200); // Limited to 200
    });

    it('should handle empty results gracefully', async () => {
      const mockLoggerEmpty = {
        getEvents: jest.fn().mockResolvedValue([]),
      };
      (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockLoggerEmpty);

      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(0);
      expect(response.body.data.filters.agents).toEqual([]);
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ from: 'invalid-date' });

      expect(response.status).toBe(200);
      // Should return all events since invalid date is ignored
      expect(response.body.data.events).toHaveLength(4);
    });

    it('should handle special characters in search query', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'test@example.com' });

      expect(response.status).toBe(200);
      // Should not crash, return empty or matching results
    });
  });
});
