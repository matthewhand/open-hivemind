import request from 'supertest';
import express from 'express';
import configRouter from '@src/webui/routes/config';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

const app = express();
app.use(express.json());
app.use('/webui', configRouter);

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

describe('Config API Routes', () => {
  let mockManager: jest.Mocked<BotConfigurationManager>;

  beforeEach(() => {
    mockManager = {
      getAllBots: jest.fn(),
      getWarnings: jest.fn(),
      isLegacyMode: jest.fn(),
      reload: jest.fn(),
      getBot: jest.fn()
    } as any;
    
    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webui/api/config', () => {
    it('should return configuration with redacted sensitive data', async () => {
      const mockBots = [
        {
          name: 'TestBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'secret-discord-token' },
          openai: { apiKey: 'secret-openai-key' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue(['Test warning']);
      mockManager.isLegacyMode.mockReturnValue(false);

      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('legacyMode');
      expect(response.body).toHaveProperty('environment');
      
      // Check that sensitive data is redacted
      expect(response.body.bots[0].discord.token).toMatch(/\*+/);
      expect(response.body.bots[0].openai.apiKey).toMatch(/\*+/);
      expect(response.body.warnings).toEqual(['Test warning']);
      expect(response.body.legacyMode).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const response = await request(app)
        .get('/webui/api/config')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to get configuration');
    });
  });

  describe('GET /webui/api/config/sources', () => {
    it('should return environment variables with redacted sensitive values', async () => {
      // Set test environment variables
      process.env.BOTS_TEST_DISCORD_BOT_TOKEN = 'test-token';
      process.env.BOTS_TEST_OPENAI_API_KEY = 'test-key';
      process.env.BOTS_TEST_MESSAGE_PROVIDER = 'discord';

      const response = await request(app)
        .get('/webui/api/config/sources')
        .expect(200);

      expect(response.body).toHaveProperty('environmentVariables');
      expect(response.body).toHaveProperty('configFiles');
      expect(response.body).toHaveProperty('overrides');
      
      const envVars = response.body.environmentVariables;
      expect(envVars['BOTS_TEST_DISCORD_BOT_TOKEN']).toBeDefined();
      expect(envVars['BOTS_TEST_DISCORD_BOT_TOKEN'].sensitive).toBe(true);
      expect(envVars['BOTS_TEST_DISCORD_BOT_TOKEN'].value).toMatch(/\*+/);
      
      // Clean up
      delete process.env.BOTS_TEST_DISCORD_BOT_TOKEN;
      delete process.env.BOTS_TEST_OPENAI_API_KEY;
      delete process.env.BOTS_TEST_MESSAGE_PROVIDER;
    });

    it('should handle missing environment variables gracefully', async () => {
      // Test with clean environment
      const response = await request(app)
        .get('/webui/api/config/sources')
        .expect(200);

      expect(response.body).toHaveProperty('environmentVariables');
      expect(response.body).toHaveProperty('configFiles');
      expect(response.body).toHaveProperty('overrides');
      expect(Array.isArray(response.body.configFiles)).toBe(true);
      expect(Array.isArray(response.body.overrides)).toBe(true);
    });
  });

  describe('POST /webui/api/config/reload', () => {
    it('should reload configuration successfully', async () => {
      mockManager.reload.mockImplementation(() => {});

      const response = await request(app)
        .post('/webui/api/config/reload')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(true);
      expect(mockManager.reload).toHaveBeenCalledTimes(1);
    });

    it('should handle reload errors gracefully', async () => {
      mockManager.reload.mockImplementation(() => {
        throw new Error('Reload failed');
      });

      const response = await request(app)
        .post('/webui/api/config/reload')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to reload configuration');
    });
  });
});