import express from 'express';
import request from 'supertest';
import { BotManager } from '../../src/managers/BotManager';
import botsRouter from '../../src/server/routes/bots';

// Mock BotManager with inline implementation
jest.mock('../../src/managers/BotManager', () => {
  const mockInstance = {
    getAllBots: jest.fn(),
    getBotsStatus: jest.fn(() => Promise.resolve([])), // Added mock
    getBot: jest.fn(),
    createBot: jest.fn(),
    cloneBot: jest.fn(),
    updateBot: jest.fn(),
    deleteBot: jest.fn(),
    startBot: jest.fn(),
    stopBot: jest.fn(),
    getBotHistory: jest.fn(),
  };
  return {
    BotManager: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

// Mock AuditLogger
jest.mock('../../src/common/auditLogger', () => ({
  AuditLogger: {
    getInstance: jest.fn(() => ({
      getBotActivity: jest.fn(() => []),
    })),
  },
}));

// Mock ActivityLogger
jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn(() => ({
      getEvents: jest.fn(() => []),
    })),
  },
}));

// Mock WebSocketService
jest.mock('../../src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      getBotStats: jest.fn(() => ({ messageCount: 0, errors: [] })),
      getMessageFlow: jest.fn(() => []),
      getBotStats: jest.fn(() => ({ messageCount: 0, errors: [] })),
    })),
  },
}));

// Mock middlewares
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logBotAction: jest.fn(),
}));

// Mock Validation Schemas
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../src/validation/schemas/botSchema', () => ({
  BotIdParamSchema: { merge: () => ({}) },
  CloneBotSchema: {},
  CreateBotSchema: {},
  UpdateBotSchema: {},
}));

const app = express();
app.use(express.json());
app.use('/api/bots', botsRouter);

// Type helper
const getMockManager = () => BotManager.getInstance() as unknown as Record<string, jest.Mock>;

describe('Bots Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bots', () => {
    it('should return all bots', async () => {
      const bots = [{ id: 'bot1', name: 'Bot 1', messageProvider: 'discord', isActive: true }];
      const statuses = [{ id: 'bot1', isRunning: true }];
      getMockManager().getAllBots.mockResolvedValue(bots);
      // Ensure getBotsStatus returns an empty array to match bots count
      getMockManager().getBotsStatus.mockResolvedValue([{ id: 'bot1', isRunning: false }]);

      const response = await request(app).get('/api/bots').expect(200);

      // The actual response will be transformed by the route handler
      // We expect an array of bot objects with additional properties like connected, messageCount, etc.
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toEqual(expect.objectContaining({
        id: 'bot1',
        name: 'Bot 1',
        connected: false,
        messageCount: 0,
        errorCount: 0
      }));
    });
  });

  // Other tests remain the same...
  describe('POST /api/bots', () => {
    it('should create a bot', async () => {
      const bot = { id: 'bot1', name: 'Bot 1', messageProvider: 'discord', llmProvider: 'openai' };
      getMockManager().createBot.mockResolvedValue(bot);

      const response = await request(app)
        .post('/api/bots')
        .send({
          name: 'Bot 1',
          messageProvider: 'discord',
          llmProvider: 'openai',
          config: { discord: { token: 'token' }, openai: { apiKey: 'key' } },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(bot);
    });
  });

  describe('POST /api/bots/:botId/clone', () => {
    it('should clone a bot', async () => {
      const bot = { id: 'bot2', name: 'Cloned Bot' };
      getMockManager().cloneBot.mockResolvedValue(bot);

      const response = await request(app)
        .post('/api/bots/bot1/clone')
        .send({ newName: 'Cloned Bot' }) // Fixed payload structure
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(bot);
    });
  });

  describe('PUT /api/bots/:botId', () => {
    it('should update a bot', async () => {
      const bot = { id: 'bot1', name: 'Bot 1', persona: 'new' };
      getMockManager().updateBot.mockResolvedValue(bot);

      const response = await request(app)
        .put('/api/bots/bot1')
        .send({ persona: 'new' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(bot);
    });
  });

  describe('DELETE /api/bots/:botId', () => {
    it('should delete a bot', async () => {
      getMockManager().deleteBot.mockResolvedValue(true);

      await request(app).delete('/api/bots/bot1').expect(200);
    });
  });

  describe('POST /api/bots/:botId/start', () => {
    it('should start a bot', async () => {
      getMockManager().startBot.mockResolvedValue(true);

      await request(app).post('/api/bots/bot1/start').expect(200);
    });
  });

  describe('POST /api/bots/:botId/stop', () => {
    it('should stop a bot', async () => {
      getMockManager().stopBot.mockResolvedValue(true);

      await request(app).post('/api/bots/bot1/stop').expect(200);
    });
  });

  describe('GET /api/bots/:botId/activity', () => {
    it('should return bot activity logs', async () => {
      const bot = { id: 'bot1', name: 'Bot 1' };
      getMockManager().getBot.mockResolvedValue(bot);

      const response = await request(app)
        .get('/api/bots/bot1/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.activity)).toBe(true);
    });

    it('should return 404 if bot not found', async () => {
      getMockManager().getBot.mockResolvedValue(null);

      await request(app)
        .get('/api/bots/bot1/activity')
        .expect(404);
    });
  });
});
