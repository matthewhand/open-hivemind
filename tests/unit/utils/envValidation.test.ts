import { validateRequiredEnvVars } from '@src/utils/envValidation';

/**
 * Tests for envValidation.ts
 * Since validateRequiredEnvVars calls process.exit(1) on failure,
 * we must mock process.exit and the Logger.
 */

jest.mock('@src/common/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

describe('validateRequiredEnvVars', () => {
  const originalEnv = { ...process.env };
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  it('does nothing in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    validateRequiredEnvVars();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('exits in production when SESSION_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.DISCORD_BOT_TOKEN = 'token';
    delete process.env.SESSION_SECRET;

    validateRequiredEnvVars();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('exits in production when no bot tokens are configured', () => {
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
      if (
        key.startsWith('BOTS_') &&
        (key.endsWith('_DISCORD_BOT_TOKEN') ||
          key.endsWith('_SLACK_BOT_TOKEN') ||
          key.endsWith('_MATTERMOST_TOKEN'))
      ) {
        delete process.env[key];
      }
    }

    validateRequiredEnvVars();
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('does not exit when all production vars and a bot token are present', () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'sess';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh';
    process.env.DISCORD_BOT_TOKEN = 'token';

    validateRequiredEnvVars();
    expect(mockExit).not.toHaveBeenCalled();
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

    validateRequiredEnvVars();
    expect(mockExit).not.toHaveBeenCalled();
  });
});
