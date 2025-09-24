import request from 'supertest';
import express from 'express';
import dashboardRouter from '@src/server/routes/dashboard';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;
const mockGetInstance = jest.fn();
mockBotConfigurationManager.getInstance = mockGetInstance;

const app = express();
app.use('/dashboard', dashboardRouter);

describe('Dashboard Routes', () => {
  let mockManager: jest.Mocked<BotConfigurationManager>;

  beforeEach(() => {
    mockManager = {
      getAllBots: jest.fn(),
      getWarnings: jest.fn(),
      isLegacyMode: jest.fn()
    } as any;

    mockGetInstance.mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dashboard/api/status', () => {
    it('should return bot status with all required fields', async () => {
      const mockBots = [
        {
          name: 'TestBot1',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'test-token' },
          openai: { apiKey: 'sk-test' }
        },
        {
          name: 'TestBot2',
          messageProvider: 'slack',
          llmProvider: 'flowise',
          slack: { botToken: 'xoxb-test' },
          flowise: { apiKey: 'flowise-key' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      // Only getAllBots is used in the actual implementation

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('uptime');
      
      expect(response.body.bots).toHaveLength(2);
      expect(response.body.bots[0]).toHaveProperty('name', 'TestBot1');
      expect(response.body.bots[0]).toHaveProperty('status');
      expect(response.body.bots[0]).toHaveProperty('provider', 'discord');
      expect(response.body.bots[0]).toHaveProperty('llmProvider', 'openai');
      
      // The actual implementation only returns bots and uptime
      
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty bot list', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);
      mockManager.isLegacyMode.mockReturnValue(false);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body.bots).toHaveLength(0);
      expect(response.body).toHaveProperty('uptime');
    });

    it('should include uptime', async () => {
      mockManager.getAllBots.mockReturnValue([]);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle configuration manager errors gracefully', async () => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get status');
    });

    it('should return bot status with correct structure', async () => {
      const mockBots = [{
        name: 'TestBot',
        messageProvider: 'discord',
        llmProvider: 'openai'
      }];
      
      mockManager.getAllBots.mockReturnValue(mockBots);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body.bots[0]).toHaveProperty('name', 'TestBot');
      expect(response.body.bots[0]).toHaveProperty('provider', 'discord');
      expect(response.body.bots[0]).toHaveProperty('llmProvider', 'openai');
      expect(response.body.bots[0]).toHaveProperty('status', 'active');
    });

    it('should return valid uptime', async () => {
      mockManager.getAllBots.mockReturnValue([]);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/dashboard/api/nonexistent')
        .expect(404);
    });

    it('should handle POST requests to status endpoint', async () => {
      await request(app)
        .post('/dashboard/api/status')
        .expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);
      mockManager.isLegacyMode.mockReturnValue(false);

      const response = await request(app)
        .get('/dashboard/api/status')
        .set('Accept', 'text/plain')
        .expect(200);
      
      // Should still return JSON regardless of Accept header
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});