import express, { Express } from 'express';
import request from 'supertest';
import { BotManager } from '../../src/managers/BotManager';
import { authenticateToken } from '../../src/server/middleware/auth';
import botsRouter from '../../src/server/routes/bots';

// Mock authentication middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'test-user', role: 'admin' };
    next();
  }),
}));

// Mock audit middleware
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: jest.fn((req, res, next) => next()),
  logBotAction: jest.fn(),
}));

describe('Bots API Endpoints', () => {
  let app: Express;
  let botManager: BotManager;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
    botManager = BotManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bots', () => {
    it('should create a new bot with minimal payload (missing config)', async () => {
      const newBot = {
        name: 'TestBotMinimal',
        messageProvider: 'discord',
        llmProvider: 'openai', // Required when no default is configured
        description: 'Created via test',
        // config is intentionally missing
      };

      const response = await request(app).post('/api/bots').send(newBot);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bot).toHaveProperty('id');
      expect(response.body.data.bot.name).toBe('TestBotMinimal');
      expect(response.body.data.bot.config).toEqual({}); // verify default empty object
    });

    it('should create a new bot with full payload', async () => {
      const newBot = {
        name: 'TestBotFull',
        messageProvider: 'discord',
        llmProvider: 'openai', // Required when no default is configured
        description: 'Created via test',
        config: {
          discord: { token: 'fake-token' },
        },
      };

      const response = await request(app).post('/api/bots').send(newBot);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bot.name).toBe('TestBotFull');
      expect(response.body.data.bot.config).toHaveProperty('discord');
    });
  });
});
