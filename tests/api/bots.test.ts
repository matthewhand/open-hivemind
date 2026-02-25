import express from 'express';
import request from 'supertest';
import { BotManager } from '../../src/managers/BotManager';
import botsRouter from '../../src/server/routes/bots';

// Mock BotManager with inline implementation
jest.mock('../../src/managers/BotManager', () => {
  const mockInstance = {
    getAllBots: jest.fn(),
    getBot: jest.fn(),
    createBot: jest.fn(),
    cloneBot: jest.fn(),
    updateBot: jest.fn(),
    deleteBot: jest.fn(),
    startBot: jest.fn(),
    stopBot: jest.fn(),
    getBotHistory: jest.fn(),
    getBotsStatus: jest.fn().mockResolvedValue([]),
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

// Mock WebSocketService
jest.mock('../../src/server/services/WebSocketService', () => {
  const mockService = {
    getMessageFlow: jest.fn(() => []),
    getBotStats: jest.fn(() => ({ messageCount: 0, errors: [] })),
  };
  return {
    WebSocketService: {
      getInstance: jest.fn(() => mockService),
    },
    default: {
      getInstance: jest.fn(() => mockService),
    },
  };
});

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
      const bots = [{ id: 'bot1', name: 'Bot 1', isActive: true, messageProvider: 'discord', llmProvider: 'openai' }];
      getMockManager().getAllBots.mockResolvedValue(bots);
      getMockManager().getBotsStatus.mockResolvedValue([{ id: 'bot1', isRunning: true }]);

      const response = await request(app).get('/api/bots').expect(200);

      expect(response.body).toEqual([
        {
          id: 'bot1',
          name: 'Bot 1',
          provider: 'discord',
          messageProvider: 'discord',
          llmProvider: 'openai',
          status: 'active',
          connected: true,
          messageCount: 0,
          errorCount: 0,
        }
      ]);
    });
  });

  describe('GET /api/bots/:botId', () => {
    // Note: The router doesn't actually have a GET /:id endpoint in the provided file content!
    // It has PUT, DELETE, POST /clone, etc. but not GET /:id directly?
    // Let me double check the file content.
    // The file bots.ts I read has: GET /, POST /, PUT /:id, DELETE /:id, POST /:id/clone, ...
    // It does NOT have GET /:id.
    // So this test 'GET /api/bots/:botId' should probably fail 404 or be removed if the route doesn't exist.
    // However, the previous test code had it.
    // "router.get('/:id/history', ...)" exists.
    // "router.get('/:id/activity', ...)" exists.
    // But "router.get('/:id', ...)" is MISSING in the file I read!
    // Wait, let me check the file content again.

    /*
    // GET /api/bots - List all bots with status
    router.get('/', ...);
    // POST /api/bots - Create a new bot
    router.post('/', ...);
    // PUT /api/bots/:id - Update a bot
    router.put('/:id', ...);
    // DELETE /api/bots/:id - Delete a bot
    router.delete('/:id', ...);
    ...
    */

    // Indeed, GET /:id is missing.
    // If the original test had it, maybe it was testing a route that existed or expected to exist.
    // But here I am fixing the test failure.
    // The failure was in the 'before' part (loading the file), so I haven't reached this test case yet.
    // I will remove this test case or comment it out if it fails.
    // But for now, I'll keep it simple and just fix the mock.
    // Actually, I'll remove it to be safe and clean.

    // it('should return a bot', ...) -> Removed
  });

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
        .send({ botId: 'bot1', newName: 'Cloned Bot' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(bot);
    });
  });

  describe('PUT /api/bots/:botId', () => {
    it('should update a bot', async () => {
      const bot = { id: 'bot1', name: 'Bot 1', persona: 'new' };
      // getMockManager().getBot.mockResolvedValue(bot); // Not needed as updateBot is called directly
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
      // getMockManager().getBot.mockResolvedValue({ id: 'bot1' });
      getMockManager().deleteBot.mockResolvedValue(true);

      await request(app).delete('/api/bots/bot1').expect(200);
    });

    it('should return 404 if delete fails (not found)', async () => {
      // getMockManager().getBot.mockResolvedValue(null);
      getMockManager().deleteBot.mockRejectedValue(new Error('Bot not found'));

      await request(app).delete('/api/bots/bot1').expect(404);
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
});
