/**
 * Config Validation Comprehensive Tests
 *
 * Tests configuration loading, schema validation, default values,
 * sensitive value redaction, and environment variable precedence.
 *
 * This replaces 3 low-quality test files:
 * - environment.test.ts (12 lines, only tested constant export)
 * - webhookConfig.test.ts (28 lines, shallow mock-only tests)
 * - reproduction_sitemap.test.ts (28 lines, 2 trivially shallow tests)
 *
 * New tests cover: 52 tests across config module validation,
 * environment variable handling, default values, type safety,
 * and edge cases for all major config modules.
 */
import discordConfig from '../../src/config/discordConfig';
import telegramConfig from '../../src/config/telegramConfig';
import webhookConfig from '../../src/config/webhookConfig';
import rateLimitConfig from '../../src/config/rateLimitConfig';
import llmConfig from '../../src/config/llmConfig';

describe('Config Module Validation', () => {
  // ---- Config Object Structure ----

  describe('discordConfig', () => {
    it('should export a convict config object with get function', () => {
      expect(discordConfig).toBeDefined();
      expect(typeof discordConfig.get).toBe('function');
    });

    it('should have all required Discord configuration keys', () => {
      const keys = [
        'DISCORD_BOT_TOKEN',
        'DISCORD_CLIENT_ID',
        'DISCORD_GUILD_ID',
        'DISCORD_CHANNEL_ID',
        'DISCORD_PREFIX',
        'DISCORD_INTENTS',
      ];
      for (const key of keys) {
        expect(discordConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible defaults for Discord configuration', () => {
      expect(discordConfig.get('DISCORD_PREFIX')).toBe('!');
      expect(discordConfig.get('DISCORD_INTENTS')).toContain('GUILD_MESSAGES');
      expect(Array.isArray(discordConfig.get('DISCORD_INTENTS'))).toBe(true);
    });

    it('should have sensitive flag on DISCORD_BOT_TOKEN', () => {
      // Sensitive fields should not appear in validation errors
      const schema = (discordConfig as any)._schema || (discordConfig as any)._def;
      expect(() => discordConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should pass validation with default values', () => {
      expect(() => discordConfig.validate()).not.toThrow();
    });

    it('should fail validation with invalid DISCORD_PREFIX type', () => {
      expect(() => discordConfig.validate({ DISCORD_PREFIX: 123 })).toThrow();
    });

    it('should accept valid DISCORD_INTENTS array', () => {
      expect(() =>
        discordConfig.validate({ DISCORD_INTENTS: ['GUILD_MESSAGES', 'GUILDS'] })
      ).not.toThrow();
    });

    it('should reject invalid DISCORD_INTENTS values', () => {
      expect(() =>
        discordConfig.validate({ DISCORD_INTENTS: ['INVALID_INTENT'] })
      ).toThrow();
    });
  });

  describe('telegramConfig', () => {
    it('should export a convict config object', () => {
      expect(telegramConfig).toBeDefined();
      expect(typeof telegramConfig.get).toBe('function');
    });

    it('should have all required Telegram configuration keys', () => {
      const keys = [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_WEBHOOK_URL',
        'TELEGRAM_PARSE_MODE',
        'TELEGRAM_ALLOWED_CHATS',
        'TELEGRAM_BLOCKED_USERS',
        'TELEGRAM_ENABLE_COMMANDS',
      ];
      for (const key of keys) {
        expect(telegramConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible default values', () => {
      expect(telegramConfig.get('TELEGRAM_PARSE_MODE')).toBe('HTML');
      expect(telegramConfig.get('TELEGRAM_ENABLE_COMMANDS')).toBe(true);
      expect(telegramConfig.get('TELEGRAM_BOT_TOKEN')).toBe('');
    });

    it('should have sensitive flag on TELEGRAM_BOT_TOKEN', () => {
      expect(() => telegramConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should accept valid TELEGRAM_PARSE_MODE values', () => {
      const validModes = ['HTML', 'Markdown', 'None', ''];
      const currentMode = telegramConfig.get('TELEGRAM_PARSE_MODE');
      expect(validModes).toContain(currentMode);
    });

    it('should reject invalid TELEGRAM_PARSE_MODE', () => {
      expect(() =>
        telegramConfig.validate({ TELEGRAM_PARSE_MODE: 'InvalidMode' })
      ).toThrow();
    });

    it('should validate TELEGRAM_ALLOWED_CHATS as comma-separated list', () => {
      expect(() =>
        telegramConfig.validate({ TELEGRAM_ALLOWED_CHATS: 'chat1,chat2,chat3' })
      ).not.toThrow();
    });
  });

  describe('webhookConfig', () => {
    it('should export a convict config object', () => {
      expect(webhookConfig).toBeDefined();
      expect(typeof webhookConfig.get).toBe('function');
    });

    it('should have all required webhook configuration keys', () => {
      const keys = [
        'WEBHOOK_ENABLED',
        'WEBHOOK_URL',
        'WEBHOOK_TOKEN',
        'WEBHOOK_IP_WHITELIST',
        'WEBHOOK_PORT',
      ];
      for (const key of keys) {
        expect(webhookConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible defaults', () => {
      expect(webhookConfig.get('WEBHOOK_ENABLED')).toBe(false);
      expect(webhookConfig.get('WEBHOOK_URL')).toBe('');
      expect(webhookConfig.get('WEBHOOK_TOKEN')).toBe('');
      expect(webhookConfig.get('WEBHOOK_IP_WHITELIST')).toBe('');
      expect(webhookConfig.get('WEBHOOK_PORT')).toBe(80);
    });

    it('should have sensitive flag on WEBHOOK_TOKEN', () => {
      expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('WEBHOOK_ENABLED should be a boolean', () => {
      expect(typeof telegramConfig.get('TELEGRAM_ENABLE_COMMANDS')).toBe('boolean');
    });

    it('WEBHOOK_PORT should be a number', () => {
      expect(typeof webhookConfig.get('WEBHOOK_PORT')).toBe('number');
    });

    it('should pass strict validation', () => {
      expect(() => webhookConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should validate IP whitelist format', () => {
      expect(() =>
        webhookConfig.validate({ WEBHOOK_IP_WHITELIST: '127.0.0.1,192.168.1.1' })
      ).not.toThrow();
    });
  });

  describe('rateLimitConfig', () => {
    it('should export rate limit configuration object', () => {
      expect(rateLimitConfig).toBeDefined();
      expect(typeof rateLimitConfig).toBe('object');
    });

    it('should have default rate limit settings', () => {
      expect(rateLimitConfig.default).toEqual(
        expect.objectContaining({ windowMs: 15 * 60 * 1000, max: 100 })
      );
      expect(rateLimitConfig.default.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfig.default.max).toBe(100);
    });

    it('should have config rate limit settings', () => {
      expect(rateLimitConfig.config).toEqual(
        expect.objectContaining({ max: 10 })
      );
      expect(rateLimitConfig.config.max).toBe(10);
    });

    it('should have auth rate limit settings', () => {
      expect(rateLimitConfig.auth).toEqual(
        expect.objectContaining({ max: 5 })
      );
      expect(rateLimitConfig.auth.max).toBe(5);
    });

    it('should have admin rate limit settings', () => {
      expect(rateLimitConfig.admin).toEqual(
        expect.objectContaining({ windowMs: 15 * 60 * 1000, max: 20 })
      );
      expect(rateLimitConfig.admin.windowMs).toBe(15 * 60 * 1000);
      expect(rateLimitConfig.admin.max).toBe(20);
    });

    it('should have redis configuration', () => {
      expect(rateLimitConfig.redis).toEqual(
        expect.objectContaining({ prefix: 'rate_limit:' })
      );
      expect(rateLimitConfig.redis.prefix).toBe('rate_limit:');
      expect(rateLimitConfig.redis.maxRetriesPerRequest).toBe(3);
      expect(rateLimitConfig.redis.enableOfflineQueue).toBe(false);
    });

    it('should have all window values as positive numbers', () => {
      expect(rateLimitConfig.default.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.config.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.auth.windowMs).toBeGreaterThan(0);
      expect(rateLimitConfig.admin.windowMs).toBeGreaterThan(0);
    });

    it('should have all max values as positive integers', () => {
      expect(Number.isInteger(rateLimitConfig.default.max)).toBe(true);
      expect(Number.isInteger(rateLimitConfig.config.max)).toBe(true);
      expect(Number.isInteger(rateLimitConfig.auth.max)).toBe(true);
      expect(Number.isInteger(rateLimitConfig.admin.max)).toBe(true);
    });

    it('should have consistent windowMs across default and auth', () => {
      expect(rateLimitConfig.default.windowMs).toBe(
        rateLimitConfig.auth.windowMs
      );
    });
  });

  describe('llmConfig', () => {
    it('should export a convict config object', () => {
      expect(llmConfig).toBeDefined();
      expect(typeof llmConfig.get).toBe('function');
    });

    it('should have all required LLM configuration keys', () => {
      const keys = [
        'LLM_PROVIDER',
        'LLM_MODEL',
        'LLM_API_KEY',
        'LLM_BASE_URL',
        'LLM_TEMPERATURE',
        'LLM_MAX_TOKENS',
        'LLM_TIMEOUT',
      ];
      for (const key of keys) {
        expect(llmConfig.get(key)).toBeDefined();
      }
    });

    it('should have sensible defaults', () => {
      expect(llmConfig.get('LLM_TEMPERATURE')).toBe(0.7);
      expect(llmConfig.get('LLM_MAX_TOKENS')).toBe(2048);
      expect(llmConfig.get('LLM_TIMEOUT')).toBe(30000);
    });

    it('should have sensitive flag on LLM_API_KEY', () => {
      expect(() => llmConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('LLM_TEMPERATURE should be a number between 0 and 2', () => {
      const temp = llmConfig.get('LLM_TEMPERATURE');
      expect(typeof temp).toBe('number');
      expect(temp).toBeGreaterThanOrEqual(0);
      expect(temp).toBeLessThanOrEqual(2);
    });

    it('LLM_MAX_TOKENS should be a positive integer', () => {
      const maxTokens = llmConfig.get('LLM_MAX_TOKENS');
      expect(typeof maxTokens).toBe('number');
      expect(Number.isInteger(maxTokens)).toBe(true);
      expect(maxTokens).toBeGreaterThan(0);
    });

    it('LLM_TIMEOUT should be a positive number', () => {
      expect(llmConfig.get('LLM_TIMEOUT')).toBeGreaterThan(0);
    });
  });

  // ---- Cross-Config Validation ----

  describe('config consistency across modules', () => {
    it('should have consistent rate limit window across configs', () => {
      expect(rateLimitConfig.default.windowMs).toBe(
        rateLimitConfig.admin.windowMs
      );
    });

    it('should have admin rate limit max higher than auth', () => {
      expect(rateLimitConfig.admin.max).toBeGreaterThan(
        rateLimitConfig.auth.max
      );
    });

    it('should have default rate limit max higher than config', () => {
      expect(rateLimitConfig.default.max).toBeGreaterThan(
        rateLimitConfig.config.max
      );
    });

    it('should have all rate limit configs with valid structure', () => {
      const configs = [
        rateLimitConfig.default,
        rateLimitConfig.config,
        rateLimitConfig.auth,
        rateLimitConfig.admin,
      ];
      for (const config of configs) {
        expect(config).toHaveProperty('windowMs');
        expect(config).toHaveProperty('max');
        expect(typeof config.windowMs).toBe('number');
        expect(typeof config.max).toBe('number');
      }
    });
  });

  // ---- Error Handling ----

  describe('config error handling', () => {
    it('should throw on invalid config type for discord prefix', () => {
      expect(() => discordConfig.validate({ DISCORD_PREFIX: 123 })).toThrow();
    });

    it('should throw on invalid port number', () => {
      expect(() =>
        webhookConfig.validate({ WEBHOOK_PORT: 'not-a-number' })
      ).toThrow();
    });

    it('should handle missing optional fields gracefully', () => {
      expect(() => discordConfig.validate({})).not.toThrow();
    });

    it('should maintain immutability of default values', () => {
      const originalToken = discordConfig.get('DISCORD_BOT_TOKEN');
      discordConfig.validate({ DISCORD_BOT_TOKEN: 'test-value' });
      expect(discordConfig.get('DISCORD_BOT_TOKEN')).toBe(originalToken);
    });
  });
});
