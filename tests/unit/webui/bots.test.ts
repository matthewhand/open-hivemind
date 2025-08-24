import request from 'supertest';
import express from 'express';
import botsRouter from '@src/webui/routes/bots';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

const app = express();
app.use(express.json());
app.use('/webui', botsRouter);

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

describe('Bots API Routes', () => {
  let mockManager: jest.Mocked<BotConfigurationManager>;

  beforeEach(() => {
    mockManager = {
      getAllBots: jest.fn(),
      getBot: jest.fn()
    } as any;
    
    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webui/api/bots', () => {
    it('should return all bots with status and capabilities', async () => {
      const mockBots = [
        {
          name: 'DiscordBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { voiceChannelId: '123456' }
        },
        {
          name: 'SlackBot',
          messageProvider: 'slack',
          llmProvider: 'flowise',
          slack: { joinChannels: 'channel1,channel2' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('providers');
      
      expect(response.body.bots).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.active).toBe(2);
      
      // Check capabilities
      expect(response.body.bots[0].capabilities.voiceSupport).toBe(true);
      expect(response.body.bots[1].capabilities.multiChannel).toBe(true);
      
      // Check providers summary
      expect(response.body.providers.message).toContain('discord');
      expect(response.body.providers.message).toContain('slack');
      expect(response.body.providers.llm).toContain('openai');
      expect(response.body.providers.llm).toContain('flowise');
    });

    it('should handle empty bot list', async () => {
      mockManager.getAllBots.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(200);

      expect(response.body.bots).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.active).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/webui/api/bots')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get bots');
    });
  });

  describe('GET /webui/api/bots/:name', () => {
    it('should return specific bot details', async () => {
      const mockBot = {
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token' }
      };
      
      mockManager.getBot.mockReturnValue(mockBot);

      const response = await request(app)
        .get('/webui/api/bots/TestBot')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('status');
      expect(response.body.name).toBe('TestBot');
      expect(response.body.status).toHaveProperty('active');
      expect(response.body.status).toHaveProperty('uptime');
      expect(response.body.status).toHaveProperty('memory');
      expect(response.body.status).toHaveProperty('connections');
    });

    it('should return 404 for non-existent bot', async () => {
      mockManager.getBot.mockReturnValue(undefined);

      const response = await request(app)
        .get('/webui/api/bots/NonExistentBot')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bot not found');
    });

    it('should handle errors gracefully', async () => {
      mockManager.getBot.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/webui/api/bots/TestBot')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get bot details');
    });
  });

  describe('GET /webui/api/bots/:name/health', () => {
    it('should return bot health metrics', async () => {
      const mockBot = {
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai'
      };
      
      mockManager.getBot.mockReturnValue(mockBot);

      const response = await request(app)
        .get('/webui/api/bots/TestBot/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(response.body.checks).toHaveProperty('messageProvider');
      expect(response.body.checks).toHaveProperty('llmProvider');
      expect(response.body.checks).toHaveProperty('memory');
      
      expect(response.body.checks.messageProvider).toHaveProperty('status');
      expect(response.body.checks.messageProvider).toHaveProperty('latency');
    });

    it('should return 404 for non-existent bot health check', async () => {
      mockManager.getBot.mockReturnValue(undefined);

      const response = await request(app)
        .get('/webui/api/bots/NonExistentBot/health')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Bot not found');
    });

    it('should handle health check errors gracefully', async () => {
      mockManager.getBot.mockImplementation(() => {
        throw new Error('Health check error');
      });

      const response = await request(app)
        .get('/webui/api/bots/TestBot/health')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get bot health');
    });
  });
});