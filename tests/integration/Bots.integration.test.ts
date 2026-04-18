import express from 'express';
import request from 'supertest';
import botsRouter from '../../src/server/routes/bots';

// Hoisted mock
jest.mock('../../src/managers/BotManager', () => {
  const mockInstance = {
    getAllBots: jest.fn(),
    getBotsStatus: jest.fn().mockResolvedValue([]),
    getBot: jest.fn(),
    createBot: jest.fn(),
    updateBot: jest.fn(),
    deleteBot: jest.fn(),
    startBot: jest.fn(),
    stopBot: jest.fn(),
  };
  return {
    BotManager: {
      getInstance: jest.fn().mockImplementation(() => Promise.resolve(mockInstance)),
    },
  };
});

// Mock middlewares
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logBotAction: jest.fn(),
}));

jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

describe('Bots API Integration', () => {
  let app: express.Express;
  let mockManager: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const { BotManager } = require('../../src/managers/BotManager');
    mockManager = await BotManager.getInstance();

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
  });

  const sampleBot = {
    id: 'bot-1',
    name: 'Test Bot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    isActive: true,
  };

  describe('GET /api/bots', () => {
    it('should return list of bots with status', async () => {
      mockManager.getAllBots.mockResolvedValue([sampleBot]);
      mockManager.getBotsStatus.mockResolvedValue([{ id: 'bot-1', isRunning: true }]);

      const response = await request(app).get('/api/bots');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // The router returns result array directly in data
      expect(response.body.data[0].id).toBe('bot-1');
      expect(response.body.data[0].connected).toBe(true);
    });
  });

  describe('POST /api/bots', () => {
    it('should create a new bot', async () => {
      mockManager.getAllBots.mockResolvedValue([]);
      mockManager.createBot.mockResolvedValue(sampleBot);

      const response = await request(app)
        .post('/api/bots')
        .send({ name: 'Test Bot', messageProvider: 'discord', llmProvider: 'openai' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/bots/:id/start', () => {
    it('should start a bot', async () => {
      mockManager.startBot.mockResolvedValue({ success: true });

      const response = await request(app).post('/api/bots/bot-1/start');

      expect(response.status).toBe(200);
      expect(mockManager.startBot).toHaveBeenCalledWith('bot-1');
    });
  });
});
