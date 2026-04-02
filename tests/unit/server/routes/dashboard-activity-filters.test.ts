import request from 'supertest';
import express from 'express';
import dashboardRouter from '@src/server/routes/dashboard';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { ActivityLogger } from '@src/server/services/ActivityLogger';
import WebSocketService from '@src/server/services/WebSocketService';

// Mock dependencies
jest.mock('@config/BotConfigurationManager');
jest.mock('@src/server/services/ActivityLogger');
jest.mock('@src/server/services/WebSocketService');
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
      expect(response.body.events).toHaveLength(4);
      expect(response.body.filters.agents).toEqual(['SalesBot', 'SupportBot']);
    });

    it('should filter by bot name', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ bot: 'SupportBot' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every((e: any) => e.botName === 'SupportBot')).toBe(true);
    });

    it('should filter by message provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ messageProvider: 'slack' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every((e: any) => e.provider === 'slack')).toBe(true);
    });

    it('should filter by LLM provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ llmProvider: 'openai' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every((e: any) => e.llmProvider === 'openai')).toBe(true);
    });

    it('should filter by severity level (error)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'error' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].status).toBe('error');
    });

    it('should filter by severity level (warning)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'warning' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].status).toBe('timeout');
    });

    it('should filter by severity level (info)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'info' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every((e: any) => e.status === 'success')).toBe(true);
    });

    it('should filter by activity type (error)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'error' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2); // error + timeout
      expect(response.body.events.some((e: any) => e.status === 'error')).toBe(true);
      expect(response.body.events.some((e: any) => e.status === 'timeout')).toBe(true);
    });

    it('should filter by activity type (message)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'message' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2); // only successful messages
      expect(response.body.events.every((e: any) => e.status === 'success')).toBe(true);
    });

    it('should filter by search query (bot name)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'support' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events.every((e: any) => e.botName.toLowerCase().includes('support'))).toBe(true);
    });

    it('should filter by search query (user)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'user1' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
    });

    it('should filter by search query (error message)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ search: 'connection' });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].errorMessage).toContain('Connection');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({
          from: '2026-03-30T11:30:00.000Z',
          to: '2026-03-30T12:30:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].id).toBe('3');
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({
          bot: 'SupportBot',
          severity: 'error',
          search: 'connection',
        });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].botName).toBe('SupportBot');
      expect(response.body.events[0].status).toBe('error');
      expect(response.body.events[0].errorMessage).toContain('Connection');
    });
  });

  describe('GET /api/dashboard/activity/export - CSV Export', () => {
    it('should export all events as CSV', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      expect(response.header['content-disposition']).toMatch(/^attachment; filename=activity_export_/);
      expect(response.text).toContain('Timestamp,Bot Name,Message Provider');
      expect(response.text).toContain('SupportBot');
      expect(response.text).toContain('SalesBot');

      // Count CSV rows (header + 4 data rows)
      const rows = response.text.split('\n').filter(r => r.trim());
      expect(rows.length).toBe(5); // 1 header + 4 events
    });

    it('should export filtered events as CSV', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .query({ bot: 'SupportBot' })
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      const rows = response.text.split('\n').filter(r => r.trim());
      expect(rows.length).toBe(3); // 1 header + 2 events

      expect(response.text).toContain('SupportBot');
      expect(response.text).not.toContain('SalesBot');
    });

    it('should include all required CSV columns', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .expect(200);

      const headers = response.text.split('\n')[0];
      expect(headers).toContain('Timestamp');
      expect(headers).toContain('Bot Name');
      expect(headers).toContain('Message Provider');
      expect(headers).toContain('LLM Provider');
      expect(headers).toContain('Status');
      expect(headers).toContain('Severity');
      expect(headers).toContain('Activity Type');
      expect(headers).toContain('Message Type');
      expect(headers).toContain('Processing Time (ms)');
      expect(headers).toContain('Error Message');
    });

    it('should properly escape CSV values', async () => {
      // Update mock to include quotes in error message
      const mockLoggerWithQuotes = {
        getEvents: jest.fn().mockResolvedValue([
          {
            id: '1',
            timestamp: '2026-03-30T10:00:00.000Z',
            botName: 'TestBot',
            provider: 'discord',
            channelId: 'channel1',
            userId: 'user1',
            messageType: 'incoming',
            contentLength: 50,
            processingTime: 120,
            status: 'error',
            errorMessage: 'Error: "Invalid input"',
          },
        ]),
      };
      (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockLoggerWithQuotes);

      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .expect(200);

      // CSV should escape quotes by doubling them
      expect(response.text).toContain('""Invalid input""');
    });

    it('should export with date range filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .query({
          from: '2026-03-30T11:30:00.000Z',
          to: '2026-03-30T12:30:00.000Z',
        })
        .expect(200);

      const rows = response.text.split('\n').filter(r => r.trim());
      expect(rows.length).toBe(2); // 1 header + 1 event
    });

    it('should export with severity filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .query({ severity: 'error' })
        .expect(200);

      const rows = response.text.split('\n').filter(r => r.trim());
      expect(rows.length).toBe(2); // 1 header + 1 error event
      expect(response.text).toContain('"error"');
    });

    it('should export with search filter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .query({ search: 'connection' })
        .expect(200);

      const rows = response.text.split('\n').filter(r => r.trim());
      expect(rows.length).toBe(2); // 1 header + 1 matching event
      expect(response.text).toContain('Connection failed');
    });
  });

  describe('Helper Functions - Severity and Activity Type Mapping', () => {
    it('should map status to severity correctly', async () => {
      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);

      // Verify severity mapping through filtering
      const errorResponse = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'error' });
      expect(errorResponse.body.events[0].status).toBe('error');

      const warningResponse = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'warning' });
      expect(warningResponse.body.events[0].status).toBe('timeout');

      const infoResponse = await request(app)
        .get('/api/dashboard/activity')
        .query({ severity: 'info' });
      expect(infoResponse.body.events.every((e: any) => e.status === 'success')).toBe(true);
    });

    it('should map message type to activity type correctly', async () => {
      const errorResponse = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'error' });

      expect(errorResponse.status).toBe(200);
      expect(errorResponse.body.events.length).toBeGreaterThan(0);
      expect(errorResponse.body.events.every((e: any) =>
        e.status === 'error' || e.status === 'timeout'
      )).toBe(true);

      const messageResponse = await request(app)
        .get('/api/dashboard/activity')
        .query({ activityType: 'message' });

      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.events.every((e: any) =>
        e.status === 'success'
      )).toBe(true);
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
      expect(response.body.events.length).toBeLessThanOrEqual(200); // Limited to 200
    });

    it('should handle empty results gracefully', async () => {
      const mockLoggerEmpty = {
        getEvents: jest.fn().mockResolvedValue([]),
      };
      (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockLoggerEmpty);

      const response = await request(app).get('/api/dashboard/activity');

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(0);
      expect(response.body.filters.agents).toEqual([]);
    });

    it('should handle invalid date formats gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .query({ from: 'invalid-date' });

      expect(response.status).toBe(200);
      // Should return all events since invalid date is ignored
      expect(response.body.events).toHaveLength(4);
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
