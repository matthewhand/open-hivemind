import { validateRequiredEnvVars } from '@src/utils/envValidation';

/**
 * Tests for envValidation.ts
 * Since validateRequiredEnvVars throws an error on validation failure,
 * we must mock the Logger.
 */

jest.mock('@src/common/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('validateRequiredEnvVars', () => {
  const originalEnv = { ...process.env };
  const validSecret = 'a'.repeat(32);
  const validPassword = 'b'.repeat(12);

  const setupValidProductionEnv = () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = validSecret;
    process.env.JWT_SECRET = validSecret;
    process.env.JWT_REFRESH_SECRET = validSecret;
    process.env.HIVEMIND_PLUGIN_SIGNING_KEY = validSecret;
    process.env.ADMIN_PASSWORD = validPassword;
    process.env.DISCORD_BOT_TOKEN = 'token';
  };

  beforeEach(() => {
    jest.resetModules();
    // Clear all keys from process.env for a clean state
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    // Restore base env
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does nothing in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('throws in production when SESSION_SECRET is missing', () => {
    setupValidProductionEnv();
    delete process.env.SESSION_SECRET;

    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('throws in production when SESSION_SECRET is too short', () => {
    setupValidProductionEnv();
    process.env.SESSION_SECRET = 'too-short';

    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('throws when PORT is invalid', () => {
    process.env.PORT = 'invalid-port';
    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('does not throw when PORT is valid', () => {
    process.env.PORT = '3000';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('throws when HTTP_ENABLED is invalid', () => {
    process.env.HTTP_ENABLED = 'yes';
    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('does not throw when HTTP_ENABLED is valid', () => {
    process.env.HTTP_ENABLED = 'true';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('throws in production when no bot tokens are configured', () => {
    setupValidProductionEnv();
    // Remove all bot tokens
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.MATTERMOST_TOKEN;
    // Remove any dynamic bot tokens
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('BOTS_') &&
        (key.endsWith('_DISCORD_BOT_TOKEN') ||
          key.endsWith('_SLACK_BOT_TOKEN') ||
          key.endsWith('_MATTERMOST_TOKEN'))
      ) {
        delete process.env[key];
      }
    }

    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('does not throw when all production vars and a bot token are present', () => {
    setupValidProductionEnv();
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('accepts a dynamic bot token as sufficient', () => {
    setupValidProductionEnv();
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.MATTERMOST_TOKEN;
    process.env.BOTS_ALPHA_DISCORD_BOT_TOKEN = 'dynamic-token';

    expect(() => validateRequiredEnvVars()).not.toThrow();
  });
});
