import express from 'express';
import request from 'supertest';
import dashboardRouter from '../../src/webui/routes/dashboard';

jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@src/webui/services/WebSocketService', () => ({
  __esModule: true,
  default: {
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

describe('dashboard activity route', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.resetAllMocks();
    app = express();
    app.use('/dashboard', dashboardRouter);

    const { BotConfigurationManager } = require('@src/config/BotConfigurationManager');
    const WebSocketService = require('@src/webui/services/WebSocketService').default;

    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManagerInstance);
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWsInstance);
  });

  it('returns activity data with filters and timeline', async () => {
    mockManagerInstance.getAllBots.mockReturnValue([
      { name: 'AgentA', messageProvider: 'slack', llmProvider: 'openai' },
      { name: 'AgentB', messageProvider: 'discord', llmProvider: 'flowise' },
    ]);

    const now = new Date();
    const earlier = new Date(now.getTime() - 60000);

    mockWsInstance.getMessageFlow.mockReturnValue([
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
    mockWsInstance.getMessageFlow.mockReturnValue([
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
  });
});
