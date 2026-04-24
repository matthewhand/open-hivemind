import {
  isValidBotInstance,
  sanitizeConfig,
  validateBotConfig,
  validateCreateBotRequest,
} from '../../../src/managers/botValidation';
import { BotInstance, CreateBotRequest } from '../../../src/managers/botTypes';

describe('botValidation', () => {
  describe('isValidBotInstance', () => {
    it('should return true for a valid BotInstance', () => {
      const validBot: Partial<BotInstance> = {
        id: 'bot-1',
        name: 'Test Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        config: {},
      };
      expect(isValidBotInstance(validBot)).toBe(true);
    });

    it('should return false if any required field is missing', () => {
      const invalidBot = {
        id: 'bot-1',
        name: 'Test Bot',
        // missing messageProvider
        llmProvider: 'openai',
        isActive: true,
      };
      expect(isValidBotInstance(invalidBot)).toBe(false);
    });

    it('should return false for null or non-object', () => {
      expect(isValidBotInstance(null)).toBe(false);
      expect(isValidBotInstance('string')).toBe(false);
    });
  });

  describe('validateCreateBotRequest', () => {
    it('should not throw for a valid request', () => {
      const validRequest: CreateBotRequest = {
        name: 'New Bot',
        messageProvider: 'slack',
        llmProvider: 'openai',
        config: {
          slack: { botToken: 'xoxb-123', signingSecret: 'secret' },
          openai: { apiKey: 'sk-123' },
        },
      };
      expect(() => validateCreateBotRequest(validRequest)).not.toThrow();
    });

    it('should throw if name is missing', () => {
      const invalidRequest: any = {
        messageProvider: 'slack',
        llmProvider: 'openai',
      };
      expect(() => validateCreateBotRequest(invalidRequest)).toThrow('Bot name is required');
    });

    it('should throw if messageProvider is invalid', () => {
      const invalidRequest: any = {
        name: 'Bot',
        messageProvider: 'invalid',
      };
      expect(() => validateCreateBotRequest(invalidRequest)).toThrow('Valid message provider is required');
    });
  });

  describe('validateBotConfig', () => {
    it('should throw if Discord config is missing token', () => {
      const config = { discord: {} };
      expect(() => validateBotConfig(config)).toThrow('Discord bot token is required');
    });

    it('should throw if Slack config is missing secrets', () => {
      const config = { slack: { botToken: 'token' } };
      expect(() => validateBotConfig(config)).toThrow('Slack signing secret is required');
    });

    it('should throw if OpenAI config is missing API key', () => {
      const config = { openai: {} };
      expect(() => validateBotConfig(config)).toThrow('OpenAI API key is required');
    });

    it('should not throw for valid configs', () => {
      const config = {
        discord: { token: 'd-token' },
        openai: { apiKey: 'o-key' },
      };
      expect(() => validateBotConfig(config)).not.toThrow();
    });
  });

  describe('sanitizeConfig', () => {
    it('should mask sensitive fields', () => {
      const config = {
        discord: { token: 'secret-discord' },
        slack: { botToken: 'secret-slack', signingSecret: 'secret-sign', appToken: 'secret-app' },
        openai: { apiKey: 'secret-openai' },
        other: { public: 'data' },
      };

      const sanitized = sanitizeConfig(config);

      expect(sanitized.discord.token).toBe('***');
      expect(sanitized.slack.botToken).toBe('***');
      expect(sanitized.slack.signingSecret).toBe('***');
      expect(sanitized.slack.appToken).toBe('***');
      expect(sanitized.openai.apiKey).toBe('***');
      expect(sanitized.other.public).toBe('data');
    });

    it('should not modify the original config', () => {
      const config = { discord: { token: 'secret' } };
      sanitizeConfig(config);
      expect(config.discord.token).toBe('secret');
    });
  });
});
