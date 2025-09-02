import request from 'supertest';
import express from 'express';
import botsRouter from '@src/webui/routes/bots';
import { BotManager } from '@src/managers/BotManager';

// Mock authentication middleware
jest.mock('@src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next()
}));

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([])
    })
  }
}));

// Mock BotManager
jest.mock('@src/managers/BotManager');
const mockBotManager = BotManager as jest.MockedClass<typeof BotManager>;

const app = express();
app.use(express.json());
app.use('/webui/api/bots', botsRouter);

describe('Bots API Routes', () => {
  let mockManager: jest.Mocked<BotManager>;

  beforeEach(() => {
    mockManager = {
      getAllBots: jest.fn(),
      getBot: jest.fn()
    } as any;
    
    mockBotManager.getInstance.mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webui/api/bots', () => {
    it('should return all bots with status and capabilities', async () => {
      const mockBots = [
        { name: 'DiscordBot' },
        { name: 'SlackBot' }
      ];
      
      mockManager.getAllBots.mockResolvedValue(mockBots);

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('bots');
      expect(response.body).toHaveProperty('total', 2);
    });

    it('should handle empty bot list', async () => {
      mockManager.getAllBots.mockResolvedValue([]);

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(200);

      expect(response.body.data.bots).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockManager.getAllBots.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get bots');
    });
  });

  describe('GET /webui/api/bots/:name', () => {
    it('should return specific bot details', async () => {
      const mockBot = { name: 'TestBot' };
      
      mockManager.getBot.mockResolvedValue(mockBot);

      const response = await request(app)
        .get('/webui/api/bots/TestBot')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('bot');
    });

    it('should return 404 for non-existent bot', async () => {
      mockManager.getBot.mockResolvedValue(null);

      const response = await request(app)
        .get('/webui/api/bots/NonExistentBot')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Bot not found');
    });

    it('should handle errors gracefully', async () => {
      mockManager.getBot.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/webui/api/bots/TestBot')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to get bot');
    });
  });


});