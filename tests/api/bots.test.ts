import express, { Express } from 'express';
import request from 'supertest';

// Mock authentication middleware - need to mock this before requiring router potentially
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', username: 'test-user', role: 'admin' };
    next();
  },
}));

describe('Bots API Endpoints', () => {
  let app: Express;

  // Mocks
  const mockAddBot = jest.fn();
  const mockUpdateBot = jest.fn();
  const mockDeleteBot = jest.fn();
  const mockCloneBot = jest.fn();
  const mockGetBot = jest.fn();

  beforeAll(() => {
    jest.resetModules();

    // Setup the mock for BotConfigurationManager
    jest.doMock('../../src/config/BotConfigurationManager', () => ({
      BotConfigurationManager: {
        getInstance: () => ({
          addBot: mockAddBot,
          updateBot: mockUpdateBot,
          deleteBot: mockDeleteBot,
          cloneBot: mockCloneBot,
          getBot: mockGetBot,
        }),
      },
    }));

    // Import router AFTER mocking
    const botsRouter = require('../../src/server/routes/bots').default;

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bots', () => {
    it('should create a new bot', async () => {
      const newBot = {
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockAddBot.mockResolvedValue(undefined);
      mockGetBot.mockReturnValue(newBot);

      const response = await request(app).post('/api/bots').send(newBot);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(newBot);
      expect(mockAddBot).toHaveBeenCalledWith(newBot);
    });

    it('should handle errors during creation', async () => {
      const newBot = { name: 'TestBot' };
      mockAddBot.mockRejectedValue(new Error('Invalid config'));

      const response = await request(app).post('/api/bots').send(newBot);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid config');
    });
  });

  describe('PUT /api/bots/:id', () => {
    it('should update a bot', async () => {
      const updates = { persona: 'new-persona' };
      mockUpdateBot.mockResolvedValue(undefined);
      mockGetBot.mockReturnValue({ name: 'TestBot', ...updates });

      const response = await request(app).put('/api/bots/TestBot').send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bot.persona).toBe('new-persona');
      expect(mockUpdateBot).toHaveBeenCalledWith('TestBot', updates);
    });

    it('should handle bot not found', async () => {
      mockUpdateBot.mockRejectedValue(new Error('Bot "TestBot" not found'));

      const response = await request(app).put('/api/bots/TestBot').send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Bot "TestBot" not found');
    });
  });

  describe('DELETE /api/bots/:id', () => {
    it('should delete a bot', async () => {
      mockDeleteBot.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/bots/TestBot');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDeleteBot).toHaveBeenCalledWith('TestBot');
    });

    it('should handle bot not found', async () => {
      mockDeleteBot.mockRejectedValue(new Error('Bot "TestBot" not found'));

      const response = await request(app).delete('/api/bots/TestBot');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/bots/:id/clone', () => {
    it('should clone a bot', async () => {
      const clonedBot = { name: 'ClonedBot' };
      mockCloneBot.mockResolvedValue(clonedBot);

      const response = await request(app).post('/api/bots/TestBot/clone').send({ newName: 'ClonedBot' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.bot).toEqual(clonedBot);
      expect(mockCloneBot).toHaveBeenCalledWith('TestBot', 'ClonedBot');
    });

    it('should require newName', async () => {
      const response = await request(app).post('/api/bots/TestBot/clone').send({});
      expect(response.status).toBe(400);
    });
  });
});
