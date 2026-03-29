/**
 * Tests for envValidation.ts
 * Since validateRequiredEnvVars throws an error on validation failure,
 * we must mock the Logger.
 */

jest.mock('@src/common/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { validateRequiredEnvVars } from '@src/utils/envValidation';

describe('validateRequiredEnvVars', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does nothing in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('throws in production when SESSION_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.DISCORD_BOT_TOKEN = 'token';
    delete process.env.SESSION_SECRET;

    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('throws in production when SESSION_SECRET is empty', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.DISCORD_BOT_TOKEN = 'token';
    process.env.SESSION_SECRET = '  ';

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
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'sess';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    // Remove all bot tokens
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.MATTERMOST_TOKEN;
    // Remove any dynamic bot tokens
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('BOTS_') && (key.endsWith('_DISCORD_BOT_TOKEN') || key.endsWith('_SLACK_BOT_TOKEN') || key.endsWith('_MATTERMOST_TOKEN'))) {
        delete process.env[key];
      }
    }

    expect(() => validateRequiredEnvVars()).toThrow('Environment validation failed');
  });

  it('does not throw when all production vars and a bot token are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'sess';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.DISCORD_BOT_TOKEN = 'token';

    expect(() => validateRequiredEnvVars()).not.toThrow();
  });

  it('accepts a dynamic bot token as sufficient', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'sess';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.MATTERMOST_TOKEN;
    process.env.BOTS_ALPHA_DISCORD_BOT_TOKEN = 'dynamic-token';

    expect(() => validateRequiredEnvVars()).not.toThrow();
  });
});
