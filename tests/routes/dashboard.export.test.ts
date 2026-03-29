import express from 'express';
import request from 'supertest';
import dashboardRouter from '../../src/server/routes/dashboard';

jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
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
  getAllBotStats: jest.fn(),
  getConnectedClients: jest.fn(),
};

const mockActivityLoggerInstance = {
  getEvents: jest.fn(),
};

const mockAnalyticsInstance = {
  getStats: jest.fn(),
  getBehaviorPatterns: jest.fn(),
  getUserSegments: jest.fn(),
};

describe('dashboard export endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.resetAllMocks();
    app = express();
    app.use('/dashboard', dashboardRouter);

    const { BotConfigurationManager } = require('@src/config/BotConfigurationManager');
    const WebSocketService = require('@src/server/services/WebSocketService').default;
    const { ActivityLogger } = require('../../src/server/services/ActivityLogger');
    const { AnalyticsService } = require('../../src/services/AnalyticsService');

    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManagerInstance);
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsInstance);
    (ActivityLogger.getInstance as jest.Mock).mockReturnValue(mockActivityLoggerInstance);
    (AnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsInstance);
  });

  describe('GET /dashboard/activity/export', () => {
    beforeEach(() => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'TestBot', messageProvider: 'slack', llmProvider: 'openai' },
      ]);

      const now = new Date();
      mockActivityLoggerInstance.getEvents.mockResolvedValue([
        {
          id: '1',
          botName: 'TestBot',
          provider: 'slack',
          channelId: 'C123',
          userId: 'U123',
          messageType: 'incoming',
          contentLength: 20,
          status: 'success',
          timestamp: now.toISOString(),
          processingTime: 150,
        },
        {
          id: '2',
          botName: 'TestBot',
          provider: 'slack',
          channelId: 'C123',
          userId: 'U123',
          messageType: 'outgoing',
          contentLength: 35,
          status: 'error',
          errorMessage: 'Test error',
          timestamp: now.toISOString(),
          processingTime: 250,
        },
      ]);

      mockWsInstance.getAllBotStats.mockReturnValue({
        TestBot: { messageCount: 2, errorCount: 1, errors: ['Test error'] },
      });
    });

    it('exports activity data as CSV', async () => {
      const response = await request(app)
        .get('/dashboard/activity/export')
        .query({ format: 'csv' })
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      expect(response.text).toContain('Timestamp');
      expect(response.text).toContain('Bot Name');
      expect(response.text).toContain('TestBot');
      expect(response.text).toContain('success');
      expect(response.text).toContain('error');
      expect(response.text).toContain('150');
      expect(response.text).toContain('Test error');
    });

    it('exports activity data as JSON', async () => {
      const response = await request(app)
        .get('/dashboard/activity/export')
        .query({ format: 'json' })
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('exportDate');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('totalEvents', 2);
      expect(response.body).toHaveProperty('events');
      expect(response.body.events).toHaveLength(2);
      expect(response.body.events[0]).toHaveProperty('botName', 'TestBot');
      expect(response.body.events[0]).toHaveProperty('llmProvider', 'openai');
    });

    it('applies filters to exported data', async () => {
      const response = await request(app)
        .get('/dashboard/activity/export')
        .query({
          format: 'json',
          bot: 'TestBot',
          messageProvider: 'slack',
        })
        .expect(200);

      expect(response.body.filters.bot).toContain('TestBot');
      expect(response.body.filters.messageProvider).toContain('slack');
    });

    it('defaults to CSV format when not specified', async () => {
      const response = await request(app)
        .get('/dashboard/activity/export')
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      expect(response.text).toContain('Timestamp');
    });
  });

  describe('GET /dashboard/analytics/export', () => {
    beforeEach(() => {
      mockManagerInstance.getAllBots.mockReturnValue([
        { name: 'TestBot', messageProvider: 'slack', llmProvider: 'openai' },
      ]);

      const now = new Date();
      mockActivityLoggerInstance.getEvents.mockResolvedValue([
        {
          id: '1',
          botName: 'TestBot',
          provider: 'slack',
          channelId: 'C123',
          userId: 'U123',
          messageType: 'incoming',
          contentLength: 20,
          status: 'success',
          timestamp: now.toISOString(),
          processingTime: 150,
        },
      ]);

      mockWsInstance.getAllBotStats.mockReturnValue({
        TestBot: { messageCount: 10, errorCount: 1, errors: ['Test error'] },
      });

      mockWsInstance.getConnectedClients.mockReturnValue([{}, {}]); // 2 connections

      mockAnalyticsInstance.getStats.mockResolvedValue({
        learningProgress: 0.85,
        behaviorPatternsCount: 5,
        userSegmentsCount: 3,
        totalMessages: 100,
        totalErrors: 5,
        avgProcessingTime: 150,
        activeBots: 2,
        activeUsers: 10,
      });

      mockAnalyticsInstance.getBehaviorPatterns.mockResolvedValue([
        {
          id: 'pattern-1',
          name: 'High Activity',
          description: 'User sends many messages',
          frequency: 0.8,
          confidence: 0.9,
          trend: 'increasing',
          segments: ['power-user'],
          recommendedWidgets: ['activity-feed'],
          priority: 1,
        },
      ]);

      mockAnalyticsInstance.getUserSegments.mockResolvedValue([
        {
          id: 'segment-1',
          name: 'Power Users',
          description: 'Highly engaged users',
          criteria: {
            behaviorPatterns: ['pattern-1'],
            usageFrequency: 'daily',
            featureUsage: ['analytics'],
            engagementLevel: 'high',
          },
          characteristics: {
            preferredWidgets: ['analytics-dashboard'],
            optimalLayout: 'grid',
            themePreference: 'dark',
            notificationFrequency: 5,
          },
          size: 50,
          confidence: 0.9,
        },
      ]);
    });

    it('exports analytics data as CSV', async () => {
      const response = await request(app)
        .get('/dashboard/analytics/export')
        .query({ format: 'csv' })
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      expect(response.text).toContain('Analytics Export Summary');
      expect(response.text).toContain('Total Messages');
      expect(response.text).toContain('100');
      expect(response.text).toContain('Bot Performance Details');
      expect(response.text).toContain('TestBot');
      expect(response.text).toContain('Error Rate');
      expect(response.text).toContain('Success Rate');
    });

    it('exports analytics data as JSON', async () => {
      const response = await request(app)
        .get('/dashboard/analytics/export')
        .query({ format: 'json' })
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('exportDate');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalMessages', 100);
      expect(response.body.summary).toHaveProperty('totalErrors', 5);
      expect(response.body.summary).toHaveProperty('errorRate', '5.00%');
      expect(response.body.summary).toHaveProperty('successRate', '95.00%');
      expect(response.body).toHaveProperty('botPerformance');
      expect(response.body).toHaveProperty('behaviorPatterns');
      expect(response.body).toHaveProperty('userSegments');
      expect(response.body).toHaveProperty('performance');
    });

    it('includes bot performance details with response time metrics', async () => {
      const response = await request(app)
        .get('/dashboard/analytics/export')
        .query({ format: 'json' })
        .expect(200);

      expect(response.body.botPerformance).toHaveLength(1);
      const botPerf = response.body.botPerformance[0];
      expect(botPerf).toHaveProperty('botName', 'TestBot');
      expect(botPerf).toHaveProperty('messageProvider', 'slack');
      expect(botPerf).toHaveProperty('llmProvider', 'openai');
      expect(botPerf).toHaveProperty('totalMessages', 10);
      expect(botPerf).toHaveProperty('avgResponseTime');
      expect(botPerf).toHaveProperty('minResponseTime');
      expect(botPerf).toHaveProperty('maxResponseTime');
      expect(botPerf).toHaveProperty('p95ResponseTime');
      expect(botPerf).toHaveProperty('p99ResponseTime');
    });

    it('applies time range filters', async () => {
      const from = new Date('2024-01-01').toISOString();
      const to = new Date('2024-12-31').toISOString();

      const response = await request(app)
        .get('/dashboard/analytics/export')
        .query({
          format: 'json',
          from,
          to,
        })
        .expect(200);

      expect(response.body.filters.from).toBe(from);
      expect(response.body.filters.to).toBe(to);
      expect(mockActivityLoggerInstance.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: new Date(from),
          endTime: new Date(to),
        })
      );
    });

    it('defaults to CSV format when not specified', async () => {
      const response = await request(app)
        .get('/dashboard/analytics/export')
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      expect(response.text).toContain('Analytics Export Summary');
    });
  });

  describe('Export error handling', () => {
    it('handles activity export errors gracefully', async () => {
      mockActivityLoggerInstance.getEvents.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/dashboard/activity/export')
        .expect(500)
        .expect((res) => {
          expect(res.body.error).toBe('Failed to export activity data');
        });
    });

    it('handles analytics export errors gracefully', async () => {
      mockAnalyticsInstance.getStats.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/dashboard/analytics/export')
        .expect(500)
        .expect((res) => {
          expect(res.body.error).toBe('Failed to export analytics data');
        });
    });
  });
});
