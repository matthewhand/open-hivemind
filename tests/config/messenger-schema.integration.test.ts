import telegramConfig from '../../src/config/telegramConfig';
import webhookConfig from '../../src/config/webhookConfig';

describe('Messenger Schema Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Telegram Config', () => {
    it('should load and validate Telegram settings from environment', () => {
      process.env.TELEGRAM_BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
      process.env.TELEGRAM_PARSE_MODE = 'Markdown';
      
      const config = require('../../src/config/telegramConfig').default;
      expect(config.get('TELEGRAM_BOT_TOKEN')).toBe(process.env.TELEGRAM_BOT_TOKEN);
      expect(config.get('TELEGRAM_PARSE_MODE')).toBe('Markdown');
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should fail on invalid parse mode', () => {
      process.env.TELEGRAM_PARSE_MODE = 'InvalidMode';
      expect(() => {
        const config = require('../../src/config/telegramConfig').default;
        config.validate({ allowed: 'strict' });
      }).toThrow();
    });
  });

  describe('Webhook Config', () => {
    it('should load and validate Webhook settings', () => {
      process.env.WEBHOOK_URL = 'https://example.com/webhook';
      process.env.WEBHOOK_SECRET = 'secret-123';
      
      const config = require('../../src/config/webhookConfig').default;
      expect(config.get('WEBHOOK_URL')).toBe('https://example.com/webhook');
      expect(config.get('WEBHOOK_SECRET')).toBe('secret-123');
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });
  });
});
