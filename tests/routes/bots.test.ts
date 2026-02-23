import express from 'express';
import request from 'supertest';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

jest.mock('../../src/config/BotConfigurationManager');

// Mock authenticateToken middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Bots API Routes', () => {
  let app: express.Application;
  let mockManager: any;
  let botsRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockManager = {
      addBot: jest.fn(),
      updateBot: jest.fn(),
      deleteBot: jest.fn(),
      cloneBot: jest.fn(),
      getBot: jest.fn(),
    };

    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockManager);

    // Re-require router to ensure it picks up the mock return value
    jest.isolateModules(() => {
      botsRouter = require('../../src/server/routes/bots').default;
    });

    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
  });

  describe('POST /api/bots', () => {
    it('should create a bot successfully', async () => {
      const newBot = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockManager.addBot.mockResolvedValue(undefined);
      mockManager.getBot.mockReturnValue(newBot);

      const res = await request(app).post('/api/bots').send(newBot);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(newBot);
      expect(mockManager.addBot).toHaveBeenCalledWith(expect.objectContaining(newBot));
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app).post('/api/bots').send({ messageProvider: 'discord' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bot name is required');
    });
  });

  describe('PUT /api/bots/:id', () => {
    it('should update a bot successfully', async () => {
      const updates = { persona: 'new-persona' };
      const updatedBot = { name: 'test-bot', ...updates };
      mockManager.updateBot.mockResolvedValue(undefined);
      mockManager.getBot.mockReturnValue(updatedBot);

      const res = await request(app).put('/api/bots/test-bot').send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(updatedBot);
      expect(mockManager.updateBot).toHaveBeenCalledWith('test-bot', updates);
    });

    it('should return 404 if bot not found', async () => {
      mockManager.updateBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).put('/api/bots/unknown').send({});
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/bots/:id', () => {
    it('should delete a bot successfully', async () => {
      mockManager.deleteBot.mockResolvedValue(undefined);

      const res = await request(app).delete('/api/bots/test-bot');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockManager.deleteBot).toHaveBeenCalledWith('test-bot');
    });

    it('should return 404 if bot not found', async () => {
      mockManager.deleteBot.mockRejectedValue(new Error('Bot "unknown" not found'));
      const res = await request(app).delete('/api/bots/unknown');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/bots/:id/clone', () => {
    it('should clone a bot successfully', async () => {
      const clonedBot = { name: 'cloned-bot' };
      mockManager.cloneBot.mockResolvedValue(clonedBot);

      const res = await request(app)
        .post('/api/bots/test-bot/clone')
        .send({ newName: 'cloned-bot' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.bot).toEqual(clonedBot);
      expect(mockManager.cloneBot).toHaveBeenCalledWith('test-bot', 'cloned-bot');
    });

    it('should return 400 if newName is missing', async () => {
      const res = await request(app).post('/api/bots/test-bot/clone').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('New bot name is required');
    });
  });
});
