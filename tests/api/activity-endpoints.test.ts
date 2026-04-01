import express, { Express } from 'express';
import request from 'supertest';
import { authenticate, requireAdmin } from '../../src/auth/middleware';
import activityRouter from '../../src/server/routes/activity';

jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'test-user', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).send('Forbidden');
    }
  }),
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected: jest.fn(() => true),
      getStats: jest.fn(() => ({
        totalMessages: 1000,
        totalChannels: 5,
        providers: { discord: 600, slack: 400 },
      })),
    })),
  },
}));

describe('Activity API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/activity', activityRouter);
  });

  afterEach(() => {
    // Clear mock function calls after each test
    (authenticate as jest.Mock).mockClear();
    (requireAdmin as jest.Mock).mockClear();
  });

  describe('GET /api/activity/messages', () => {
    it('should return message activity with default filters', async () => {
      const response = await request(app).get('/api/activity/messages');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('filter');
      expect(Array.isArray(response.body.data.messages)).toBe(true);
    });

    it('should apply query filters', async () => {
      const response = await request(app).get('/api/activity/messages').query({
        messageProvider: 'discord',
        limit: '50',
        offset: '10',
      });
      expect(response.status).toBe(200);
      expect(response.body.data.filter.messageProvider).toBe('discord');
      expect(response.body.data.filter.limit).toBe(50);
      expect(response.body.data.filter.offset).toBe(10);
    });
  });

  describe('GET /api/activity/llm-usage', () => {
    it('should return LLM usage metrics', async () => {
      const response = await request(app).get('/api/activity/llm-usage');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('usage');
      expect(response.body.data).toHaveProperty('filter');
      expect(Array.isArray(response.body.data.usage)).toBe(true);
    });

    it('should apply LLM provider filter', async () => {
      const response = await request(app)
        .get('/api/activity/llm-usage')
        .query({ llmProvider: 'openai' });
      expect(response.status).toBe(200);
      expect(response.body.data.filter.llmProvider).toBe('openai');
    });
  });

  describe('GET /api/activity/summary', () => {
    it('should return activity summary', async () => {
      const response = await request(app).get('/api/activity/summary');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalMessages');
      expect(response.body.data.summary).toHaveProperty('totalAgents');
      expect(response.body.data.summary).toHaveProperty('averageResponseTime');
      expect(response.body.data.summary).toHaveProperty('errorRate');
    });
  });

  describe('GET /api/activity/chart-data', () => {
    it('should return chart data with default parameters', async () => {
      const response = await request(app).get('/api/activity/chart-data');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('messageActivity');
      expect(response.body.data).toHaveProperty('llmUsage');
      expect(response.body.data).toHaveProperty('interval');
      expect(Array.isArray(response.body.data.messageActivity)).toBe(true);
      expect(Array.isArray(response.body.data.llmUsage)).toBe(true);
    });

    it('should apply filters and interval', async () => {
      const response = await request(app).get('/api/activity/chart-data').query({
        messageProvider: 'discord',
        interval: 'day',
      });
      expect(response.status).toBe(200);
      expect(response.body.data.interval).toBe('day');
      expect(response.body.data.filter.messageProvider).toBe('discord');
    });
  });

  describe('GET /api/activity/agents', () => {
    it('should return agent activity statistics', async () => {
      const response = await request(app).get('/api/activity/agents');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('agents');
      expect(Array.isArray(response.body.data.agents)).toBe(true);
      expect(response.body.data.agents.length).toBeGreaterThan(0);
      expect(response.body.data.agents[0]).toHaveProperty('agentId');
      expect(response.body.data.agents[0]).toHaveProperty('agentName');
    });
  });

  describe('GET /api/activity/mcp-tools', () => {
    it('should return MCP tool usage statistics', async () => {
      const response = await request(app).get('/api/activity/mcp-tools');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('mcpTools');
      expect(Array.isArray(response.body.data.mcpTools)).toBe(true);
      expect(response.body.data.mcpTools.length).toBeGreaterThan(0);
      expect(response.body.data.mcpTools[0]).toHaveProperty('toolName');
      expect(response.body.data.mcpTools[0]).toHaveProperty('serverName');
    });
  });

  describe('POST /api/activity/log', () => {
    it('should log an activity event', async () => {
      const activityData = {
        agentId: 'agent_1',
        messageProvider: 'discord',
        llmProvider: 'openai',
        messageType: 'incoming',
        contentLength: 100,
        processingTime: 250,
        status: 'success',
      };

      const response = await request(app).post('/api/activity/log').send(activityData);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle activity logging with MCP tools', async () => {
      const activityData = {
        agentId: 'agent_1',
        messageProvider: 'discord',
        llmProvider: 'openai',
        messageType: 'outgoing',
        contentLength: 200,
        processingTime: 300,
        status: 'success',
        mcpToolsUsed: ['web_search', 'file_read'],
      };

      const response = await request(app).post('/api/activity/log').send(activityData);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
