/**
 * Tests for API Key Validation Utilities
 */

import {
  validateApiKey,
  getApiKeyFormatHint,
  getApiKeyFormatDescription,
  hasApiKeyValidation,
  validateMultipleApiKeys,
} from '../apiKeyValidation';

describe('apiKeyValidation', () => {
  describe('validateApiKey', () => {
    describe('OpenAI keys', () => {
      it('should validate correct OpenAI API key', () => {
        const validKey = 'sk-' + 'a'.repeat(48);
        const result = validateApiKey('openai', validKey);
        expect(result.isValid).toBe(true);
        expect(result.message).toBeUndefined();
      });

      it('should reject OpenAI key with wrong prefix', () => {
        const invalidKey = 'pk-' + 'a'.repeat(48);
        const result = validateApiKey('openai', invalidKey, true);
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('invalid');
      });

      it('should reject OpenAI key with wrong length', () => {
        const invalidKey = 'sk-' + 'a'.repeat(30);
        const result = validateApiKey('openai', invalidKey, true);
        expect(result.isValid).toBe(false);
      });

      it('should provide warning for malformed key in non-strict mode', () => {
        const invalidKey = 'sk-' + 'a'.repeat(30);
        const result = validateApiKey('openai', invalidKey, false);
        expect(result.isValid).toBe(true);
        expect(result.message).toContain('Warning');
      });
    });

    describe('Anthropic keys', () => {
      it('should validate correct Anthropic API key', () => {
        const validKey = 'sk-ant-' + 'a'.repeat(40);
        const result = validateApiKey('anthropic', validKey);
        expect(result.isValid).toBe(true);
      });

      it('should validate Anthropic key with hyphens and underscores', () => {
        const validKey = 'sk-ant-api03-' + 'a'.repeat(30) + '-' + 'b'.repeat(10);
        const result = validateApiKey('anthropic', validKey);
        expect(result.isValid).toBe(true);
      });

      it('should reject Anthropic key with wrong prefix', () => {
        const invalidKey = 'sk-' + 'a'.repeat(40);
        const result = validateApiKey('anthropic', invalidKey, true);
        expect(result.isValid).toBe(false);
      });

      it('should reject Anthropic key that is too short', () => {
        const invalidKey = 'sk-ant-' + 'a'.repeat(30);
        const result = validateApiKey('anthropic', invalidKey, true);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Discord tokens', () => {
      it('should validate correct Discord bot token', () => {
        const validToken = 'A'.repeat(59);
        const result = validateApiKey('discord', validToken);
        expect(result.isValid).toBe(true);
      });

      it('should validate Discord token with hyphens and underscores', () => {
        const validToken = 'MTk4NzA1MDMyMzU5_abc-' + 'X'.repeat(40);
        const result = validateApiKey('discord', validToken);
        expect(result.isValid).toBe(true);
      });

      it('should reject Discord token that is too short', () => {
        const invalidToken = 'A'.repeat(40);
        const result = validateApiKey('discord', invalidToken, true);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Telegram tokens', () => {
      it('should validate correct Telegram bot token', () => {
        const validToken = '1234567890:' + 'A'.repeat(35);
        const result = validateApiKey('telegram', validToken);
        expect(result.isValid).toBe(true);
      });

      it('should validate Telegram token with underscores and hyphens', () => {
        const validToken = '1234567890:ABCDEF_GHIJKL-' + 'X'.repeat(20);
        const result = validateApiKey('telegram', validToken);
        expect(result.isValid).toBe(true);
      });

      it('should reject Telegram token without colon separator', () => {
        const invalidToken = '1234567890' + 'A'.repeat(35);
        const result = validateApiKey('telegram', invalidToken, true);
        expect(result.isValid).toBe(false);
      });

      it('should reject Telegram token with wrong bot_id length', () => {
        const invalidToken = '12345:' + 'A'.repeat(35);
        const result = validateApiKey('telegram', invalidToken, true);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Slack tokens', () => {
      it('should validate correct Slack bot token', () => {
        const validToken = 'xoxb-1234567890-1234567890-' + 'A'.repeat(24);
        const result = validateApiKey('slack', validToken);
        expect(result.isValid).toBe(true);
      });

      it('should reject Slack token with wrong prefix', () => {
        const invalidToken = 'xoxp-1234567890-1234567890-' + 'A'.repeat(24);
        const result = validateApiKey('slack', invalidToken, true);
        expect(result.isValid).toBe(false);
      });

      it('should reject Slack token with wrong hash length', () => {
        const invalidToken = 'xoxb-1234567890-1234567890-' + 'A'.repeat(20);
        const result = validateApiKey('slack', invalidToken, true);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Generic validation', () => {
      it('should reject empty keys', () => {
        const result = validateApiKey('openai', '');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('required');
      });

      it('should reject null/undefined keys', () => {
        const result1 = validateApiKey('openai', null as any);
        expect(result1.isValid).toBe(false);

        const result2 = validateApiKey('openai', undefined as any);
        expect(result2.isValid).toBe(false);
      });

      it('should reject keys that are too short', () => {
        const result = validateApiKey('openai', 'abc');
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('too short');
      });

      it('should trim whitespace from keys', () => {
        const validKey = '  sk-' + 'a'.repeat(48) + '  ';
        const result = validateApiKey('openai', validKey);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Unknown providers', () => {
      it('should accept keys for unknown providers in non-strict mode', () => {
        const result = validateApiKey('unknownprovider', 'some-long-api-key-here-12345', false);
        expect(result.isValid).toBe(true);
        expect(result.hint).toContain('No specific format validation');
      });

      it('should accept long keys for unknown providers', () => {
        const result = validateApiKey('unknownprovider', 'a'.repeat(30), false);
        expect(result.isValid).toBe(true);
      });

      it('should reject short keys for unknown providers', () => {
        const result = validateApiKey('unknownprovider', 'short', false);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('getApiKeyFormatHint', () => {
    it('should return hint for OpenAI', () => {
      const hint = getApiKeyFormatHint('openai');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-');
    });

    it('should return hint for Anthropic', () => {
      const hint = getApiKeyFormatHint('anthropic');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-ant-');
    });

    it('should return hint for Discord', () => {
      const hint = getApiKeyFormatHint('discord');
      expect(hint).toBeDefined();
      expect(hint).toContain('59');
    });

    it('should return hint for Telegram', () => {
      const hint = getApiKeyFormatHint('telegram');
      expect(hint).toBeDefined();
      expect(hint).toContain('bot_id');
    });

    it('should return hint for Slack', () => {
      const hint = getApiKeyFormatHint('slack');
      expect(hint).toBeDefined();
      expect(hint).toContain('xoxb-');
    });

    it('should return undefined for unknown provider', () => {
      const hint = getApiKeyFormatHint('unknownprovider');
      expect(hint).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const hint1 = getApiKeyFormatHint('OpenAI');
      const hint2 = getApiKeyFormatHint('OPENAI');
      expect(hint1).toBe(hint2);
    });
  });

  describe('getApiKeyFormatDescription', () => {
    it('should return description for OpenAI', () => {
      const desc = getApiKeyFormatDescription('openai');
      expect(desc).toBeDefined();
      expect(desc).toContain('sk-');
    });

    it('should return description for Anthropic', () => {
      const desc = getApiKeyFormatDescription('anthropic');
      expect(desc).toBeDefined();
      expect(desc).toContain('sk-ant-');
    });

    it('should return undefined for unknown provider', () => {
      const desc = getApiKeyFormatDescription('unknownprovider');
      expect(desc).toBeUndefined();
    });
  });

  describe('hasApiKeyValidation', () => {
    it('should return true for supported providers', () => {
      expect(hasApiKeyValidation('openai')).toBe(true);
      expect(hasApiKeyValidation('anthropic')).toBe(true);
      expect(hasApiKeyValidation('discord')).toBe(true);
      expect(hasApiKeyValidation('telegram')).toBe(true);
      expect(hasApiKeyValidation('slack')).toBe(true);
    });

    it('should return false for unsupported providers', () => {
      expect(hasApiKeyValidation('unknownprovider')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasApiKeyValidation('OpenAI')).toBe(true);
      expect(hasApiKeyValidation('DISCORD')).toBe(true);
    });
  });

  describe('validateMultipleApiKeys', () => {
    it('should validate multiple keys', () => {
      const keys = {
        openai: 'sk-' + 'a'.repeat(48),
        anthropic: 'sk-ant-' + 'b'.repeat(40),
        discord: 'c'.repeat(60),
      };

      const results = validateMultipleApiKeys(keys);
      expect(results.openai.isValid).toBe(true);
      expect(results.anthropic.isValid).toBe(true);
      expect(results.discord.isValid).toBe(true);
    });

    it('should identify invalid keys in batch', () => {
      const keys = {
        openai: 'invalid-key',
        anthropic: 'sk-ant-' + 'b'.repeat(40),
      };

      const results = validateMultipleApiKeys(keys, true);
      expect(results.openai.isValid).toBe(false);
      expect(results.anthropic.isValid).toBe(true);
    });

    it('should handle empty object', () => {
      const results = validateMultipleApiKeys({});
      expect(Object.keys(results)).toHaveLength(0);
    });
  });
});
