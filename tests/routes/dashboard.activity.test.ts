import express from 'express';
import request from 'supertest';
import dashboardRouter from '../../src/server/routes/dashboard';

jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
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
  getMessageFlow: jest.fn(),
  getAllBotStats: jest.fn(),
};

const mockActivityLoggerInstance = {
  getEvents: jest.fn(),
};

const mockAnalyticsServiceInstance = {
  getStats: jest.fn(),
  getBehaviorPatterns: jest.fn(),
  getUserSegments: jest.fn(),
  getRecommendations: jest.fn(),
};

describe('dashboard activity route', () => {
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
    (AnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsServiceInstance);

    // Setup default mock returns for analytics endpoints
    mockAnalyticsServiceInstance.getStats.mockReturnValue({
      learningProgress: 50,
      behaviorPatternsCount: 3,
      userSegmentsCount: 2,
      totalMessages: 100,
      totalErrors: 5,
      avgProcessingTime: 500,
      activeBots: 2,
      activeUsers: 10,
    });
    mockAnalyticsServiceInstance.getBehaviorPatterns.mockReturnValue([
      { id: 'pattern-1', name: 'Test Pattern', description: 'Test', frequency: 0.5, confidence: 0.8, trend: 'stable', segments: [], recommendedWidgets: [], priority: 1 },
    ]);
    mockAnalyticsServiceInstance.getUserSegments.mockReturnValue([
      { id: 'segment-1', name: 'Test Segment', description: 'Test', criteria: { behaviorPatterns: [], usageFrequency: 'daily', featureUsage: [], engagementLevel: 'high' }, characteristics: { preferredWidgets: [], optimalLayout: 'grid', themePreference: 'dark', notificationFrequency: 5 }, size: 10, confidence: 0.9 },
    ]);
    mockAnalyticsServiceInstance.getRecommendations.mockReturnValue([
      { id: 'rec-1', type: 'widget', title: 'Test Recommendation', description: 'Test', confidence: 0.9, impact: 'high', reasoning: 'Test reasoning' },
    ]);
  });

  it('returns activity data with filters and timeline', async () => {
    mockManagerInstance.getAllBots.mockReturnValue([
      { name: 'AgentA', messageProvider: 'slack', llmProvider: 'openai' },
      { name: 'AgentB', messageProvider: 'discord', llmProvider: 'flowise' },
    ]);

    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);

    mockActivityLoggerInstance.getEvents.mockReturnValue([
      {
        id: '1',
        botName: 'AgentA',
        provider: 'slack',
        channelId: 'C1',
        userId: 'U1',
        messageType: 'incoming',
        contentLength: 20,
        status: 'success',
        timestamp: earlier.toISOString(),
      },
      {
        id: '2',
        botName: 'AgentB',
        provider: 'discord',
        channelId: 'C2',
        userId: 'U2',
        messageType: 'outgoing',
        contentLength: 35,
        status: 'error',
        errorMessage: 'Boom',
        timestamp: now.toISOString(),
      },
    ]);

    mockWsInstance.getAllBotStats.mockReturnValue({
      AgentA: { messageCount: 5, errors: [] },
      AgentB: { messageCount: 9, errors: ['Boom'] },
    });

    const response = await request(app).get('/dashboard/api/activity');

    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(2);
    expect(response.body.filters.agents).toEqual(expect.arrayContaining(['AgentA', 'AgentB']));
    expect(response.body.timeline.length).toBeGreaterThan(0);
    expect(response.body.agentMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ botName: 'AgentA', events: 1, errors: 0, totalMessages: 5 }),
        expect.objectContaining({ botName: 'AgentB', events: 1, errors: 1, totalMessages: 9 }),
      ])
    );
  });

  it('applies query filters', async () => {
    mockManagerInstance.getAllBots.mockReturnValue([
      { name: 'AgentA', messageProvider: 'slack', llmProvider: 'openai' },
    ]);

    const ts = new Date().toISOString();
    mockActivityLoggerInstance.getEvents.mockReturnValue([
      {
        id: '1',
        botName: 'AgentA',
        provider: 'slack',
        channelId: 'C1',
        userId: 'U1',
        messageType: 'incoming',
        contentLength: 20,
        status: 'success',
        timestamp: ts,
      },
    ]);

    mockWsInstance.getAllBotStats.mockReturnValue({ AgentA: { messageCount: 3, errors: [] } });

    const response = await request(app)
      .get('/dashboard/api/activity')
      .query({ bot: 'AgentA', messageProvider: 'slack', llmProvider: 'openai', from: ts, to: ts });

    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(1);

    // Also verify getEvents was called with correct filter
    expect(mockActivityLoggerInstance.getEvents).toHaveBeenCalledWith(expect.objectContaining({
      startTime: expect.any(Date),
      endTime: expect.any(Date)
    }));
  });
});
