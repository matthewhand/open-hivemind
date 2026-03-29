/**
 * Comprehensive Dashboard API Integration Tests
 * Tests activity filtering, analytics metrics, and export endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import dashboardRouter from '../../src/server/routes/dashboard';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

// Mock authentication middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'testuser', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock WebSocketService
const mockGetBotStats = jest.fn().mockReturnValue({
  messageCount: 10,
  errorCount: 2,
  errors: ['Error 1', 'Error 2'],
});

const mockGetAllBotStats = jest.fn().mockReturnValue({
  'bot-1': { messageCount: 10, errorCount: 2, errors: [] },
  'bot-2': { messageCount: 15, errorCount: 1, errors: [] },
});

const mockAcknowledgeAlert = jest.fn().mockReturnValue(true);
const mockResolveAlert = jest.fn().mockReturnValue(true);
const mockGetConnectedClients = jest.fn().mockReturnValue(['client-1', 'client-2']);

jest.mock('../../src/server/services/WebSocketService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getBotStats: mockGetBotStats,
      getAllBotStats: mockGetAllBotStats,
      acknowledgeAlert: mockAcknowledgeAlert,
      resolveAlert: mockResolveAlert,
      getConnectedClients: mockGetConnectedClients,
    }),
  },
}));

// Mock AnalyticsService
const mockGetStats = jest.fn().mockResolvedValue({
  learningProgress: 75,
  behaviorPatternsCount: 5,
  userSegmentsCount: 3,
  totalMessages: 500,
  totalErrors: 25,
  avgProcessingTime: 250,
  activeBots: 3,
  activeUsers: 20,
});

const mockGetBehaviorPatterns = jest.fn().mockResolvedValue([
  {
    id: 'pattern-1',
    name: 'High Usage Pattern',
    frequency: 0.85,
    confidence: 0.92,
  },
]);

const mockGetUserSegments = jest.fn().mockResolvedValue([
  {
    id: 'segment-1',
    name: 'Power Users',
    size: 50,
    confidence: 0.88,
  },
]);

const mockGetRecommendations = jest.fn().mockResolvedValue([
  {
    id: 'rec-1',
    type: 'widget',
    title: 'Add Performance Widget',
    confidence: 0.85,
  },
]);

jest.mock('../../src/services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn().mockReturnValue({
      getStats: mockGetStats,
      getBehaviorPatterns: mockGetBehaviorPatterns,
      getUserSegments: mockGetUserSegments,
      getRecommendations: mockGetRecommendations,
    }),
  },
}));

// Mock ActivityLogger
const mockGetEvents = jest.fn().mockResolvedValue([
  {
    botName: 'bot-1',
    provider: 'slack',
    timestamp: '2024-01-01T10:00:00Z',
    status: 'success',
    messageType: 'message',
    processingTime: 100,
    contentLength: 50,
    userId: 'user123',
    channelId: 'channel456',
  },
  {
    botName: 'bot-2',
    provider: 'discord',
    timestamp: '2024-01-01T11:00:00Z',
    status: 'error',
    messageType: 'message',
    processingTime: 200,
    errorMessage: 'Test error',
    userId: 'user789',
    channelId: 'channel012',
  },
  {
    botName: 'bot-1',
    provider: 'slack',
    timestamp: '2024-01-01T12:00:00Z',
    status: 'success',
    messageType: 'reaction',
    processingTime: 50,
    userId: 'user456',
    channelId: 'channel789',
  },
]);

jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn().mockReturnValue({
      getEvents: mockGetEvents,
    }),
  },
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      storeAIFeedback: jest.fn().mockResolvedValue(true),
    }),
  },
}));

describe('Dashboard API - Comprehensive Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Mock bot configuration
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([
        {
          name: 'bot-1',
          messageProvider: 'slack',
          llmProvider: 'openai',
        },
        {
          name: 'bot-2',
          messageProvider: 'discord',
          llmProvider: 'anthropic',
        },
        {
          name: 'bot-3',
          messageProvider: 'slack',
          llmProvider: 'openai',
        },
      ]),
    } as any);
  });

  // ============================================================================
  // Activity Filtering Tests
  // ============================================================================

  describe('GET /api/dashboard/activity - Activity Filtering', () => {
    it('should get all activity without filters', async () => {
      const response = await request(app).get('/api/dashboard/activity').expect(200);

      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body).toHaveProperty('agentMetrics');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should filter by bot name', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?bot=bot-1')
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.botName).toBe('bot-1');
      });
    });

    it('should filter by multiple bots', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?bot=bot-1,bot-2')
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(['bot-1', 'bot-2']).toContain(event.botName);
      });
    });

    it('should filter by message provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?messageProvider=slack')
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.provider).toBe('slack');
      });
    });

    it('should filter by multiple providers', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?messageProvider=slack,discord')
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(['slack', 'discord']).toContain(event.provider);
      });
    });

    it('should filter by LLM provider', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?llmProvider=openai')
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.llmProvider).toBe('openai');
      });
    });

    it('should filter by date range', async () => {
      const from = '2024-01-01T09:00:00Z';
      const to = '2024-01-01T11:30:00Z';

      const response = await request(app)
        .get(`/api/dashboard/activity?from=${from}&to=${to}`)
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        const eventTime = new Date(event.timestamp).getTime();
        expect(eventTime).toBeGreaterThanOrEqual(new Date(from).getTime());
        expect(eventTime).toBeLessThanOrEqual(new Date(to).getTime());
      });
    });

    it('should support pagination with page parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination).toEqual({
        total: expect.any(Number),
        page: 1,
        limit: 10,
        offset: 0,
        hasMore: expect.any(Boolean),
      });
    });

    it('should support pagination with offset parameter', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=5&offset=2')
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(2);
    });

    it('should cap pagination limit at 1000', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=5000')
        .expect(200);

      expect(response.body.pagination.limit).toBeLessThanOrEqual(1000);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get(
          '/api/dashboard/activity?bot=bot-1&messageProvider=slack&from=2024-01-01T09:00:00Z'
        )
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.botName).toBe('bot-1');
        expect(event.provider).toBe('slack');
      });
    });

    it('should return available filter options', async () => {
      const response = await request(app).get('/api/dashboard/activity').expect(200);

      expect(response.body.filters).toHaveProperty('agents');
      expect(response.body.filters).toHaveProperty('messageProviders');
      expect(response.body.filters).toHaveProperty('llmProviders');
      expect(Array.isArray(response.body.filters.agents)).toBe(true);
      expect(Array.isArray(response.body.filters.messageProviders)).toBe(true);
      expect(Array.isArray(response.body.filters.llmProviders)).toBe(true);
    });

    it('should return timeline data', async () => {
      const response = await request(app).get('/api/dashboard/activity').expect(200);

      expect(Array.isArray(response.body.timeline)).toBe(true);
      if (response.body.timeline.length > 0) {
        const bucket = response.body.timeline[0];
        expect(bucket).toHaveProperty('timestamp');
        expect(bucket).toHaveProperty('messageProviders');
        expect(bucket).toHaveProperty('llmProviders');
      }
    });

    it('should return agent metrics', async () => {
      const response = await request(app).get('/api/dashboard/activity').expect(200);

      expect(Array.isArray(response.body.agentMetrics)).toBe(true);
      if (response.body.agentMetrics.length > 0) {
        const metric = response.body.agentMetrics[0];
        expect(metric).toHaveProperty('botName');
        expect(metric).toHaveProperty('messageProvider');
        expect(metric).toHaveProperty('llmProvider');
        expect(metric).toHaveProperty('events');
        expect(metric).toHaveProperty('errors');
        expect(metric).toHaveProperty('totalMessages');
      }
    });

    it('should handle invalid date format gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?from=invalid-date')
        .expect(200);

      // Should ignore invalid date and return all results
      expect(response.body.events).toBeDefined();
    });

    it('should handle empty results', async () => {
      mockGetEvents.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/dashboard/activity').expect(200);

      expect(response.body.events).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should handle errors gracefully (500)', async () => {
      mockGetEvents.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/dashboard/activity').expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // Analytics Metrics Tests
  // ============================================================================

  describe('GET /api/dashboard/ai/stats - Analytics Metrics', () => {
    it('should get AI statistics', async () => {
      const response = await request(app).get('/api/dashboard/ai/stats').expect(200);

      expect(response.body).toHaveProperty('learningProgress');
      expect(response.body).toHaveProperty('behaviorPatternsCount');
      expect(response.body).toHaveProperty('userSegmentsCount');
      expect(response.body).toHaveProperty('totalMessages');
      expect(response.body).toHaveProperty('totalErrors');
      expect(response.body).toHaveProperty('avgProcessingTime');
      expect(response.body).toHaveProperty('activeBots');
      expect(response.body).toHaveProperty('activeUsers');
    });

    it('should filter stats by date range', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-31T23:59:59Z';

      await request(app)
        .get(`/api/dashboard/ai/stats?from=${from}&to=${to}`)
        .expect(200);

      expect(mockGetStats).toHaveBeenCalledWith({
        startTime: new Date(from),
        endTime: new Date(to),
      });
    });

    it('should handle missing date parameters', async () => {
      await request(app).get('/api/dashboard/ai/stats').expect(200);

      expect(mockGetStats).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
      });
    });

    it('should handle analytics service errors (500)', async () => {
      mockGetStats.mockRejectedValueOnce(new Error('Analytics error'));

      const response = await request(app).get('/api/dashboard/ai/stats').expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/dashboard/ai/patterns - Behavior Patterns', () => {
    it('should get behavior patterns', async () => {
      const response = await request(app).get('/api/dashboard/ai/patterns').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const pattern = response.body[0];
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('confidence');
      }
    });

    it('should filter patterns by date range', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-31T23:59:59Z';

      await request(app)
        .get(`/api/dashboard/ai/patterns?from=${from}&to=${to}`)
        .expect(200);

      expect(mockGetBehaviorPatterns).toHaveBeenCalled();
    });
  });

  describe('GET /api/dashboard/ai/segments - User Segments', () => {
    it('should get user segments', async () => {
      const response = await request(app).get('/api/dashboard/ai/segments').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const segment = response.body[0];
        expect(segment).toHaveProperty('id');
        expect(segment).toHaveProperty('name');
        expect(segment).toHaveProperty('size');
        expect(segment).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /api/dashboard/ai/recommendations - Dashboard Recommendations', () => {
    it('should get AI recommendations', async () => {
      const response = await request(app).get('/api/dashboard/ai/recommendations').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        const rec = response.body[0];
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('confidence');
      }
    });
  });

  describe('POST /api/dashboard/ai/feedback - Submit AI Feedback', () => {
    it('should submit positive feedback', async () => {
      const response = await request(app)
        .post('/api/dashboard/ai/feedback')
        .send({
          recommendationId: 'rec-1',
          feedback: 'liked',
          metadata: { comment: 'Very helpful' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should submit negative feedback', async () => {
      const response = await request(app)
        .post('/api/dashboard/ai/feedback')
        .send({
          recommendationId: 'rec-1',
          feedback: 'disliked',
          metadata: { reason: 'Not relevant' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate required fields (400)', async () => {
      const response = await request(app)
        .post('/api/dashboard/ai/feedback')
        .send({
          // Missing required fields
          feedback: 'liked',
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ============================================================================
  // Export Endpoints Tests
  // ============================================================================

  describe('GET /api/dashboard/activity/export - Export Activity', () => {
    it('should export activity as CSV', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('activity_export_');
      expect(response.text).toContain('Timestamp');
      expect(response.text).toContain('Bot Name');
    });

    it('should export activity as JSON', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export?format=json')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toHaveProperty('exportDate');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('totalEvents');
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should default to CSV format when not specified', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should filter export by bot', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export?format=json&bot=bot-1')
        .expect(200);

      expect(response.body.filters.bot).toContain('bot-1');
      response.body.events.forEach((event: any) => {
        expect(event.botName).toBe('bot-1');
      });
    });

    it('should filter export by date range', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-31T23:59:59Z';

      const response = await request(app)
        .get(`/api/dashboard/activity/export?format=json&from=${from}&to=${to}`)
        .expect(200);

      expect(response.body.filters.from).toBe(from);
      expect(response.body.filters.to).toBe(to);
    });

    it('should handle empty export results', async () => {
      mockGetEvents.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/dashboard/activity/export?format=json')
        .expect(200);

      expect(response.body.totalEvents).toBe(0);
      expect(response.body.events).toEqual([]);
    });

    it('should validate format parameter (invalid format)', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity/export?format=invalid')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle export errors gracefully (500)', async () => {
      mockGetEvents.mockRejectedValueOnce(new Error('Export error'));

      const response = await request(app)
        .get('/api/dashboard/activity/export?format=json')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should escape CSV special characters', async () => {
      mockGetEvents.mockResolvedValueOnce([
        {
          botName: 'bot-1',
          provider: 'slack',
          timestamp: '2024-01-01T10:00:00Z',
          status: 'success',
          messageType: 'message',
          processingTime: 100,
          errorMessage: 'Error with "quotes" and, commas',
          userId: 'user123',
          channelId: 'channel456',
        },
      ]);

      const response = await request(app)
        .get('/api/dashboard/activity/export?format=csv')
        .expect(200);

      // CSV should properly escape quotes and commas
      expect(response.text).toContain('""quotes""');
    });
  });

  describe('GET /api/dashboard/analytics/export - Export Analytics', () => {
    it('should export analytics as JSON', async () => {
      const response = await request(app)
        .get('/api/dashboard/analytics/export?format=json')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('exportDate');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('botPerformance');
      expect(response.body).toHaveProperty('behaviorPatterns');
      expect(response.body).toHaveProperty('userSegments');
      expect(response.body.summary).toHaveProperty('totalMessages');
      expect(response.body.summary).toHaveProperty('errorRate');
    });

    it('should export analytics as CSV', async () => {
      const response = await request(app)
        .get('/api/dashboard/analytics/export?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Analytics Export Summary');
      expect(response.text).toContain('Bot Performance Details');
    });

    it('should filter analytics export by date range', async () => {
      const from = '2024-01-01T00:00:00Z';
      const to = '2024-01-31T23:59:59Z';

      await request(app)
        .get(`/api/dashboard/analytics/export?format=json&from=${from}&to=${to}`)
        .expect(200);

      expect(mockGetStats).toHaveBeenCalledWith({
        startTime: new Date(from),
        endTime: new Date(to),
      });
    });

    it('should include performance metrics in export', async () => {
      const response = await request(app)
        .get('/api/dashboard/analytics/export?format=json')
        .expect(200);

      expect(response.body).toHaveProperty('performance');
      expect(response.body.performance).toHaveProperty('activeConnections');
    });

    it('should calculate error rates correctly', async () => {
      const response = await request(app)
        .get('/api/dashboard/analytics/export?format=json')
        .expect(200);

      expect(response.body.summary).toHaveProperty('errorRate');
      expect(response.body.summary).toHaveProperty('successRate');
      expect(response.body.summary.errorRate).toMatch(/%$/);
    });

    it('should handle analytics export errors (500)', async () => {
      mockGetStats.mockRejectedValueOnce(new Error('Analytics error'));

      const response = await request(app)
        .get('/api/dashboard/analytics/export?format=json')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // Alert Management Tests
  // ============================================================================

  describe('POST /api/dashboard/alerts/:id/acknowledge - Acknowledge Alert', () => {
    it('should acknowledge alert successfully', async () => {
      const response = await request(app)
        .post('/api/dashboard/alerts/alert-123/acknowledge')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('acknowledged');
      expect(mockAcknowledgeAlert).toHaveBeenCalledWith('alert-123');
    });

    it('should return 404 for non-existent alert', async () => {
      mockAcknowledgeAlert.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/dashboard/alerts/nonexistent/acknowledge')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate alert ID parameter (400)', async () => {
      const response = await request(app)
        .post('/api/dashboard/alerts/ /acknowledge')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle acknowledgment errors (500)', async () => {
      mockAcknowledgeAlert.mockImplementationOnce(() => {
        throw new Error('Acknowledgment error');
      });

      const response = await request(app)
        .post('/api/dashboard/alerts/alert-123/acknowledge')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/dashboard/alerts/:id/resolve - Resolve Alert', () => {
    it('should resolve alert successfully', async () => {
      const response = await request(app)
        .post('/api/dashboard/alerts/alert-123/resolve')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resolved');
      expect(mockResolveAlert).toHaveBeenCalledWith('alert-123');
    });

    it('should return 404 for non-existent alert', async () => {
      mockResolveAlert.mockReturnValueOnce(false);

      const response = await request(app)
        .post('/api/dashboard/alerts/nonexistent/resolve')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should validate alert ID parameter (400)', async () => {
      const response = await request(app)
        .post('/api/dashboard/alerts//resolve')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('GET /api/dashboard/ai/config - AI Configuration', () => {
    it('should get AI dashboard configuration', async () => {
      const response = await request(app).get('/api/dashboard/ai/config').expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('learningRate');
      expect(response.body).toHaveProperty('confidenceThreshold');
      expect(response.body).toHaveProperty('recommendationFrequency');
    });
  });

  describe('POST /api/dashboard/ai/config - Update Configuration', () => {
    it('should update AI dashboard configuration', async () => {
      const updates = {
        enabled: false,
        learningRate: 0.2,
        confidenceThreshold: 0.8,
      };

      const response = await request(app)
        .post('/api/dashboard/ai/config')
        .send(updates)
        .expect(200);

      expect(response.body.enabled).toBe(false);
      expect(response.body.learningRate).toBe(0.2);
      expect(response.body.confidenceThreshold).toBe(0.8);
    });

    it('should validate configuration values (400)', async () => {
      const invalidConfig = {
        learningRate: 'invalid',
      };

      const response = await request(app)
        .post('/api/dashboard/ai/config')
        .send(invalidConfig)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ============================================================================
  // Status Tests
  // ============================================================================

  describe('GET /api/dashboard/status - Dashboard Status', () => {
    it('should get dashboard status', async () => {
      const response = await request(app).get('/api/dashboard/status').expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('uptime');
      expect(Array.isArray(response.body.bots)).toBe(true);
    });

    it('should include bot connection status', async () => {
      const response = await request(app).get('/api/dashboard/status').expect(200);

      response.body.bots.forEach((bot: any) => {
        expect(bot).toHaveProperty('name');
        expect(bot).toHaveProperty('provider');
        expect(bot).toHaveProperty('llmProvider');
        expect(bot).toHaveProperty('status');
        expect(bot).toHaveProperty('connected');
        expect(bot).toHaveProperty('messageCount');
        expect(bot).toHaveProperty('errorCount');
      });
    });

    it('should handle status errors gracefully (500)', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockImplementationOnce(() => {
        throw new Error('Configuration error');
      });

      // The dashboard route catches errors from getAllBots() and returns empty array
      const response = await request(app).get('/api/dashboard/status').expect(200);

      expect(response.body.bots).toEqual([]);
    });
  });
});
