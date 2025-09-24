import request from 'supertest';
import express from 'express';
import validationRouter from '@src/server/routes/validation';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

// Mock auth middleware
jest.mock('@src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock RealTimeValidationService to avoid setInterval
jest.mock('@src/server/services/RealTimeValidationService', () => ({
  RealTimeValidationService: {
    getInstance: jest.fn().mockReturnValue({
      // Mock methods as needed
    }),
  },
}));

const app = express();
app.use(express.json());
app.use('/webui', validationRouter);

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

describe('Validation API Routes', () => {
  let mockManager: jest.Mocked<BotConfigurationManager>;

  beforeEach(() => {
    mockManager = {
      getAllBots: jest.fn(),
      getWarnings: jest.fn()
    } as any;
    
    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webui/api/validation', () => {
    it('should return validation results for current configuration', async () => {
      const mockBots = [
        {
          name: 'TestBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'valid-discord-token-12345678901234567890123456789012345678901234567890' },
          openai: { apiKey: 'sk-validopenaikey123456789012345678901234567890' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body).toHaveProperty('isValid');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('botValidation');
      expect(response.body).toHaveProperty('environmentValidation');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(response.body.isValid).toBe(true);
      expect(Array.isArray(response.body.botValidation)).toBe(true);
      expect(response.body.botValidation[0]).toHaveProperty('name', 'TestBot');
      expect(response.body.botValidation[0]).toHaveProperty('valid', true);
    });

    it('should detect invalid bot configurations', async () => {
      const mockBots = [
        {
          name: 'InvalidBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'short' }, // Invalid token
          openai: { apiKey: 'invalid-key' } // Invalid API key
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue(['Test warning']);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.warnings).toContain('Test warning');
      expect(response.body.botValidation[0].valid).toBe(false);
      expect(response.body.botValidation[0].warnings).toContain('Discord token appears to be invalid (too short)');
      expect(response.body.botValidation[0].warnings).toContain('OpenAI API key should start with "sk-"');
    });

    it('should handle missing required configurations', async () => {
      const mockBots = [
        {
          name: 'IncompleteBot',
          messageProvider: 'discord',
          llmProvider: 'openai'
          // Missing discord and openai configurations
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body.botValidation[0].valid).toBe(false);
      expect(response.body.botValidation[0].errors).toContain('Discord bot token is required');
      expect(response.body.botValidation[0].errors).toContain('OpenAI API key is required');
    });

    it('should handle errors gracefully', async () => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to validate configuration');
    });
  });

  describe('POST /webui/api/validation/test', () => {
    it('should validate test configuration successfully', async () => {
      const testConfig = {
        bots: [
          {
            name: 'TestBot',
            messageProvider: 'discord',
            llmProvider: 'openai',
            discord: { token: 'valid-token' },
            openai: { apiKey: 'sk-validkey' }
          }
        ]
      };

      const response = await request(app)
        .post('/webui/api/validation/test')
        .send({ config: testConfig })
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('warnings');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('timestamp');
      
      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should detect errors in test configuration', async () => {
      const testConfig = {
        bots: [
          {
            // Missing required fields
            messageProvider: 'discord',
            llmProvider: 'openai'
          }
        ]
      };

      const response = await request(app)
        .post('/webui/api/validation/test')
        .send({ config: testConfig })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors.some(error => error.includes('Name is required'))).toBe(true);
    });

    it('should return 400 for missing configuration data', async () => {
      const response = await request(app)
        .post('/webui/api/validation/test')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Configuration data required');
    });

    it('should handle malformed configuration gracefully', async () => {
      const testConfig = {
        bots: 'invalid-bots-data' // Should be array
      };

      const response = await request(app)
        .post('/webui/api/validation/test')
        .send({ config: testConfig })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors.some(error => error.includes('must include a "bots" array'))).toBe(true);
    });
  });

  describe('GET /webui/api/validation/schema', () => {
    it('should return validation schema', async () => {
      const response = await request(app)
        .get('/webui/api/validation/schema')
        .expect(200);

      expect(response.body).toHaveProperty('botConfig');
      expect(response.body.botConfig).toHaveProperty('required');
      expect(response.body.botConfig).toHaveProperty('properties');
      
      expect(response.body.botConfig.required).toContain('name');
      expect(response.body.botConfig.required).toContain('messageProvider');
      expect(response.body.botConfig.required).toContain('llmProvider');
      
      expect(response.body.botConfig.properties).toHaveProperty('discord');
      expect(response.body.botConfig.properties).toHaveProperty('slack');
      expect(response.body.botConfig.properties).toHaveProperty('openai');
    });

    it('should handle schema errors gracefully', async () => {
      // Mock a scenario where schema generation fails
      const originalJSON = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Schema error');
      });

      const response = await request(app)
        .get('/webui/api/validation/schema')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to get validation schema');
      
      // Restore original function
      JSON.stringify = originalJSON;
    });
  });

  describe('Validation Logic', () => {
    it('should generate appropriate recommendations for single provider', async () => {
      const mockBots = [
        {
          name: 'OnlyDiscord',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'valid-token' },
          openai: { apiKey: 'sk-validkey' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body.recommendations.some(rec => 
        rec.includes('multiple message providers')
      )).toBe(true);
    });

    it('should validate Slack configuration properly', async () => {
      const mockBots = [
        {
          name: 'SlackBot',
          messageProvider: 'slack',
          llmProvider: 'flowise',
          slack: { 
            botToken: 'xoxb-validtoken',
            signingSecret: 'validsigningsecret123456789012345678901234567890'
          },
          flowise: { apiKey: 'flowise-key' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body.botValidation[0].valid).toBe(true);
      expect(response.body.botValidation[0].errors).toHaveLength(0);
    });

    it('should detect missing Slack signing secret', async () => {
      const mockBots = [
        {
          name: 'IncompleteSlackBot',
          messageProvider: 'slack',
          llmProvider: 'flowise',
          slack: { 
            botToken: 'xoxb-validtoken'
            // Missing signingSecret
          }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      const response = await request(app)
        .get('/webui/api/validation')
        .expect(200);

      expect(response.body.botValidation[0].valid).toBe(false);
      expect(response.body.botValidation[0].errors).toContain('Slack signing secret is required');
    });
  });
});