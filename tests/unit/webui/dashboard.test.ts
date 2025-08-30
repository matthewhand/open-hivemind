import request from 'supertest';
import express from 'express';
import dashboardRouter from '@src/webui/routes/dashboard';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

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
    
    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);
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
      mockManager.getWarnings.mockReturnValue(['Test warning']);
      mockManager.isLegacyMode.mockReturnValue(false);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('warnings');
      
      expect(response.body.bots).toHaveLength(2);
      expect(response.body.bots[0]).toHaveProperty('name', 'TestBot1');
      expect(response.body.bots[0]).toHaveProperty('status');
      expect(response.body.bots[0]).toHaveProperty('provider', 'discord');
      expect(response.body.bots[0]).toHaveProperty('llmProvider', 'openai');
      
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.warnings).toContain('Test warning');
      
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
      expect(response.body.warnings).toHaveLength(0);
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('system');
    });

    it('should include system metrics', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);
      mockManager.isLegacyMode.mockReturnValue(false);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system.memory).toHaveProperty('used');
      expect(response.body.system.memory).toHaveProperty('total');
      expect(response.body.system.memory).toHaveProperty('percentage');
      
      expect(typeof response.body.system.memory.used).toBe('number');
      expect(typeof response.body.system.memory.total).toBe('number');
      expect(typeof response.body.system.memory.percentage).toBe('number');
    });

    it('should handle configuration manager errors gracefully', async () => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get dashboard status');
    });

    it('should include legacy mode status', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);
      mockManager.isLegacyMode.mockReturnValue(true);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('legacyMode', true);
    });

    it('should return valid timestamp', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);
      mockManager.isLegacyMode.mockReturnValue(false);

      const beforeRequest = Date.now();
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      const afterRequest = Date.now();
      
      expect(response.body).toHaveProperty('timestamp');
      const responseTime = new Date(response.body.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(beforeRequest);
      expect(responseTime).toBeLessThanOrEqual(afterRequest);
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