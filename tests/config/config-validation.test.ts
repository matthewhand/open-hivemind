/**
 * Config Validation Comprehensive Tests
 *
 * Tests configuration loading, schema validation, default values,
 * and environment variable handling for all major config modules.
 */
import discordConfig from '../../src/config/discordConfig';
import telegramConfig from '../../src/config/telegramConfig';
import webhookConfig from '../../src/config/webhookConfig';
import rateLimitConfig from '../../src/config/rateLimitConfig';
import llmConfig from '../../src/config/llmConfig';

describe('Config Module Validation', () => {
  // ---- Config Object Structure ----

  describe('discordConfig', () => {
    it('should export a config object with get function', () => {
      expect(discordConfig).toBeDefined();
      expect(typeof discordConfig.get).toBe('function');
    });

    it('should have all expected Discord configuration keys', () => {
      const keys = [
        'DISCORD_BOT_TOKEN',
        'DISCORD_CLIENT_ID',
        'DISCORD_GUILD_ID',
        'DISCORD_CHANNEL_ID',
      ];
      for (const key of keys) {
        expect(discordConfig.get(key as any)).toBeDefined();
      }
    });

    it('should pass validation with default values', () => {
      expect(() => discordConfig.validate({ allowed: 'strict' })).not.toThrow();
    });
  });

  describe('telegramConfig', () => {
    it('should export a config object', () => {
      expect(telegramConfig).toBeDefined();
      expect(typeof telegramConfig.get).toBe('function');
    });

    it('should have all expected Telegram configuration keys', () => {
      const keys = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_WEBHOOK_URL',
        'TELEGRAM_PARSE_MODE',
      ];
      for (const key of keys) {
        expect(telegramConfig.get(key as any)).toBeDefined();
      }
    });

    it('should have sensible default values', () => {
      expect(telegramConfig.get('TELEGRAM_PARSE_MODE')).toBe('HTML');
      expect(telegramConfig.get('TELEGRAM_BOT_TOKEN')).toBe('');
    });
  });

  describe('webhookConfig', () => {
    it('should export a config object', () => {
      expect(webhookConfig).toBeDefined();
      expect(typeof webhookConfig.get).toBe('function');
    });

    it('should have all expected webhook configuration keys', () => {
      const keys = [
        'WEBHOOK_ENABLED',
        'WEBHOOK_URL',
        'WEBHOOK_TOKEN',
        'WEBHOOK_IP_WHITELIST',
        'WEBHOOK_PORT',
      ];
      for (const key of keys) {
        expect(webhookConfig.get(key as any)).toBeDefined();
      }
    });

    it('should have sensible defaults', () => {
      expect(webhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
      expect(webhookConfig.get('WEBHOOK_PORT')).toBe(80);
    });
  });

  describe('rateLimitConfig', () => {
    it('should export rate limit configuration object', () => {
      expect(rateLimitConfig).toBeDefined();
      expect(typeof rateLimitConfig).toBe('object');
    });

    it('should have all required rate limit categories', () => {
      expect(rateLimitConfig).toHaveProperty('default');
      expect(rateLimitConfig).toHaveProperty('auth');
      expect(rateLimitConfig).toHaveProperty('config');
      expect(rateLimitConfig).toHaveProperty('admin');
      expect(rateLimitConfig).toHaveProperty('api');
    });

    it('should have all window values as positive numbers', () => {
      expect(rateLimitConfig.default.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.config.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.auth.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.admin.windowMs).toBeGreaterThan(0);
    });
  });

  describe('llmConfig', () => {
    it('should export a config object', () => {
      expect(llmConfig).toBeDefined();
      expect(typeof llmConfig.get).toBe('function');
    });

    it('should have all required LLM configuration keys', () => {
      const keys = [
        'LLM_PROVIDER',
        'DEFAULT_EMBEDDING_PROVIDER',
        'LLM_PARALLEL_EXECUTION',
      ];
      for (const key of keys) {
        expect(llmConfig.get(key as any)).toBeDefined();
      }
    });

    it('should have sensible defaults', () => {
      expect(llmConfig.get('LLM_PROVIDER')).toBeDefined();
    });
  });

  // ---- Error Handling ----

  describe('config error handling', () => {
    it('should throw on invalid port number for webhook', () => {
      // Create a local copy to test validation without affecting global config
      const original = webhookConfig.get('WEBHOOK_PORT');
      // @ts-ignore
      webhookConfig.set('WEBHOOK_PORT', 'not-a-number');
      expect(() => webhookConfig.validate({ allowed: 'strict' })).toThrow();
      webhookConfig.set('WEBHOOK_PORT', original);
    });

    it('should handle missing optional fields gracefully', () => {
      expect(() => discordConfig.validate({ allowed: 'strict' })).not.toThrow();
    });
  });
});
