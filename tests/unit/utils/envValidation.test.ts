import { validateRequiredEnvVars } from '../../../src/utils/envValidation';
import Logger from '../../../src/common/logger';

jest.mock('../../../src/common/logger');

describe('validateRequiredEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should pass in development with default environment', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('should throw if PORT is not a number', () => {
    process.env.PORT = 'abc';
    expect(() => validateRequiredEnvVars()).toThrow(/PORT must be a valid number/);
  });

  it('should pass if PORT is a valid number string', () => {
    process.env.PORT = '3000';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Set valid required vars by default to test individual failures
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      process.env.HIVEMIND_PLUGIN_SIGNING_KEY = 'a'.repeat(32);
      process.env.ADMIN_PASSWORD = 'b'.repeat(12);
      process.env.SESSION_SECRET = 'c'.repeat(32);
      process.env.JWT_SECRET = 'd'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'e'.repeat(32);
      process.env.DISCORD_BOT_TOKEN = 'valid-token';
    });

    it('should pass with all required production variables', () => {
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });

    it('should throw if OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => validateRequiredEnvVars()).toThrow(/OPENAI_API_KEY is required/);
    });

    it('should throw if HIVEMIND_PLUGIN_SIGNING_KEY is missing or too short', () => {
      delete process.env.HIVEMIND_PLUGIN_SIGNING_KEY;
      expect(() => validateRequiredEnvVars()).toThrow(/HIVEMIND_PLUGIN_SIGNING_KEY is required/);

      process.env.HIVEMIND_PLUGIN_SIGNING_KEY = 'too-short';
      expect(() => validateRequiredEnvVars()).toThrow(/HIVEMIND_PLUGIN_SIGNING_KEY is required/);
    });

    it('should throw if ADMIN_PASSWORD is missing or too short', () => {
      delete process.env.ADMIN_PASSWORD;
      expect(() => validateRequiredEnvVars()).toThrow(/ADMIN_PASSWORD is required/);

      process.env.ADMIN_PASSWORD = 'short';
      expect(() => validateRequiredEnvVars()).toThrow(/ADMIN_PASSWORD is required/);
    });

    it('should throw if SESSION_SECRET is missing or too short', () => {
      delete process.env.SESSION_SECRET;
      expect(() => validateRequiredEnvVars()).toThrow(/SESSION_SECRET is required/);

      process.env.SESSION_SECRET = 'short';
      expect(() => validateRequiredEnvVars()).toThrow(/SESSION_SECRET is required/);
    });

    it('should throw if JWT_SECRET is missing or too short', () => {
      delete process.env.JWT_SECRET;
      expect(() => validateRequiredEnvVars()).toThrow(/JWT_SECRET is required/);

      process.env.JWT_SECRET = 'short';
      expect(() => validateRequiredEnvVars()).toThrow(/JWT_SECRET is required/);
    });

    it('should throw if JWT_REFRESH_SECRET is missing or too short', () => {
      delete process.env.JWT_REFRESH_SECRET;
      expect(() => validateRequiredEnvVars()).toThrow(/JWT_REFRESH_SECRET is required/);

      process.env.JWT_REFRESH_SECRET = 'short';
      expect(() => validateRequiredEnvVars()).toThrow(/JWT_REFRESH_SECRET is required/);
    });

    it('should throw if no messaging tokens are provided', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      delete process.env.SLACK_BOT_TOKEN;
      delete process.env.MATTERMOST_TOKEN;

      expect(() => validateRequiredEnvVars()).toThrow(/at least one messaging platform token/);
    });

    it('should pass if SLACK_BOT_TOKEN is provided instead of DISCORD_BOT_TOKEN', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.SLACK_BOT_TOKEN = 'slack-token';
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });

    it('should pass if MATTERMOST_TOKEN is provided instead of DISCORD_BOT_TOKEN', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.MATTERMOST_TOKEN = 'mm-token';
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });

    it('should pass if a dynamic BOTS_* token is provided', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.BOTS_MYBOT_DISCORD_BOT_TOKEN = 'dynamic-token';
      expect(() => validateRequiredEnvVars()).not.toThrow();
    });
  });

  it('should log errors to Logger before throwing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    expect(() => validateRequiredEnvVars()).toThrow();
    expect(Logger.error).toHaveBeenCalled();
  });
});
