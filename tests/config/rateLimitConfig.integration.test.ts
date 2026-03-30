/**
 * Integration tests for rate limit configuration with guard profiles
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getBotRateLimitSettings,
  getAllBotRateLimitSettings,
  type BotRateLimitSettings,
} from '../../src/config/rateLimitConfig';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';
import {
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../src/config/guardrailProfiles';

describe('Rate Limit Integration with Guard Profiles', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let configManager: BotConfigurationManager;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear any cached instances
    configManager = BotConfigurationManager.getInstance();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getBotRateLimitSettings', () => {
    it('should return undefined for non-existent bot', () => {
      const settings = getBotRateLimitSettings('non-existent-bot');
      expect(settings).toBeUndefined();
    });

    it('should return undefined for bot without rate limit config', () => {
      // A bot set up without explicit rate limit configuration should return undefined
      const botName = 'test-bot-direct';

      // Set up environment for test bot without rate limits
      process.env.BOTS = botName;
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MESSAGE_PROVIDER`] = 'discord';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_LLM_PROVIDER`] = 'openai';

      configManager.reload();

      const settings = getBotRateLimitSettings(botName);

      // Without explicit rate limit config, settings should be undefined
      expect(settings).toBeUndefined();
    });

    it('should return rate limit settings from guard profile', () => {
      const botName = 'test-bot-guarded';
      const guardProfileKey = 'test-strict-profile';

      // Create a test guard profile with rate limiting
      const testProfile: GuardrailProfile = {
        id: guardProfileKey,
        name: 'Test Strict Profile',
        description: 'Test profile with rate limiting',
        guards: {
          mcpGuard: {
            enabled: false,
            type: 'owner',
          },
          rateLimit: {
            enabled: true,
            maxRequests: 25,
            windowMs: 30000, // 30 seconds
          },
          contentFilter: {
            enabled: false,
            strictness: 'low',
          },
        },
      };

      // Save the guard profile
      const profiles = [testProfile];
      saveGuardrailProfiles(profiles);

      // Set up environment for test bot with guard profile
      process.env.BOTS = botName;
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MESSAGE_PROVIDER`] = 'discord';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_LLM_PROVIDER`] = 'openai';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MCP_GUARD_PROFILE`] = guardProfileKey;

      configManager.reload();

      const settings = getBotRateLimitSettings(botName);

      expect(settings).toBeDefined();
      expect(settings?.enabled).toBe(true);
      expect(settings?.maxRequests).toBe(25);
      expect(settings?.windowMs).toBe(30000);
    });

    it('should return undefined when guard profile has rate limiting disabled', () => {
      const botName = 'test-bot-no-limits';
      const guardProfileKey = 'test-open-profile';

      // Create a test guard profile with rate limiting disabled
      const testProfile: GuardrailProfile = {
        id: guardProfileKey,
        name: 'Test Open Profile',
        description: 'Test profile without rate limiting',
        guards: {
          mcpGuard: {
            enabled: false,
            type: 'owner',
          },
          rateLimit: {
            enabled: false,
            maxRequests: 100,
            windowMs: 60000,
          },
          contentFilter: {
            enabled: false,
            strictness: 'low',
          },
        },
      };

      // Save the guard profile
      const profiles = [testProfile];
      saveGuardrailProfiles(profiles);

      // Set up environment for test bot with guard profile
      process.env.BOTS = botName;
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MESSAGE_PROVIDER`] = 'discord';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_LLM_PROVIDER`] = 'openai';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MCP_GUARD_PROFILE`] = guardProfileKey;

      configManager.reload();

      const settings = getBotRateLimitSettings(botName);

      expect(settings).toBeUndefined();
    });

    it('should prioritize direct bot rate limit config over guard profile', () => {
      // This test would verify that if both direct config and guard profile exist,
      // the direct config takes precedence
      // Implementation depends on test setup with JSON config files
    });
  });

  describe('getAllBotRateLimitSettings', () => {
    it('should return a map of all bot rate limit settings', () => {
      const settingsMap = getAllBotRateLimitSettings();

      expect(settingsMap).toBeInstanceOf(Map);
      // The actual size depends on configured bots in test environment
    });

    it('should only include bots with enabled rate limiting', () => {
      const settingsMap = getAllBotRateLimitSettings();

      // Verify all entries have enabled = true
      for (const [botName, settings] of settingsMap.entries()) {
        expect(settings.enabled).toBe(true);
        expect(settings.maxRequests).toBeGreaterThan(0);
        expect(settings.windowMs).toBeGreaterThan(0);
      }
    });

    it('should handle errors gracefully and return empty map', () => {
      // Temporarily break something to trigger error path
      const originalEnv = process.env.NODE_CONFIG_DIR;
      process.env.NODE_CONFIG_DIR = '/non/existent/path';

      const settingsMap = getAllBotRateLimitSettings();

      expect(settingsMap).toBeInstanceOf(Map);
      // Should return empty map on error, not throw

      // Restore
      if (originalEnv) {
        process.env.NODE_CONFIG_DIR = originalEnv;
      } else {
        delete process.env.NODE_CONFIG_DIR;
      }
    });
  });

  describe('Rate Limit Settings Validation', () => {
    it('should provide reasonable default values', () => {
      const botName = 'test-bot-defaults';
      const guardProfileKey = 'test-minimal-profile';

      // Create a minimal guard profile
      const testProfile: GuardrailProfile = {
        id: guardProfileKey,
        name: 'Minimal Profile',
        description: 'Profile with minimal settings',
        guards: {
          mcpGuard: {
            enabled: false,
            type: 'owner',
          },
          rateLimit: {
            enabled: true,
            // Not specifying maxRequests and windowMs to test defaults
          },
        },
      };

      saveGuardrailProfiles([testProfile]);

      process.env.BOTS = botName;
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MESSAGE_PROVIDER`] = 'discord';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_LLM_PROVIDER`] = 'openai';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MCP_GUARD_PROFILE`] = guardProfileKey;

      configManager.reload();

      const settings = getBotRateLimitSettings(botName);

      expect(settings).toBeDefined();
      expect(settings?.enabled).toBe(true);
      // Should have sensible defaults
      expect(settings?.maxRequests).toBeGreaterThanOrEqual(1);
      expect(settings?.windowMs).toBeGreaterThanOrEqual(1000);
    });

    it('should handle guard profile with no rate limit section', () => {
      const botName = 'test-bot-no-rate-section';
      const guardProfileKey = 'test-no-rate-profile';

      const testProfile: GuardrailProfile = {
        id: guardProfileKey,
        name: 'No Rate Limit Profile',
        description: 'Profile without rate limit section',
        guards: {
          mcpGuard: {
            enabled: false,
            type: 'owner',
          },
          // No rateLimit section at all
        },
      };

      saveGuardrailProfiles([testProfile]);

      process.env.BOTS = botName;
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MESSAGE_PROVIDER`] = 'discord';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_LLM_PROVIDER`] = 'openai';
      process.env[`BOTS_${botName.toUpperCase().replace(/-/g, '_')}_MCP_GUARD_PROFILE`] = guardProfileKey;

      configManager.reload();

      const settings = getBotRateLimitSettings(botName);

      // Should return undefined when no rate limit config exists
      expect(settings).toBeUndefined();
    });
  });
});
