import Logger from '../../../src/common/logger';
import { validateRequiredEnvVars } from '../../../src/utils/envValidation';

jest.mock('../../../src/common/logger');

describe('validateRequiredEnvVars', () => {
  const originalEnv = process.env;

  // Every env var the validator inspects. We clear these before each test so the
  // suite is hermetic: it must not depend on values that leak in from preceding
  // test files (process.env is global and other suites mutate it). Without this,
  // the same assertions pass in isolation but can fail when run in the combined
  // `tests/unit` batch if an earlier test leaves one of these set.
  const VALIDATED_ENV_VARS = [
    'NODE_ENV',
    'PORT',
    'HTTP_ENABLED',
    'SKIP_MESSENGERS',
    'SESSION_SECRET',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DISCORD_BOT_TOKEN',
    'SLACK_BOT_TOKEN',
    'MATTERMOST_TOKEN',
    'HIVEMIND_PLUGIN_SIGNING_KEY',
    'ADMIN_PASSWORD',
    'OPENAI_API_KEY',
    'FORCE_TRUSTED_LOGIN',
    'DISABLE_ENCRYPTION',
    'ALLOW_INSECURE_PRODUCTION',
  ];

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Start from a known-clean slate so leaked values can't change behavior.
    for (const key of VALIDATED_ENV_VARS) {
      delete process.env[key];
    }
    // Dynamic per-bot tokens (BOTS_*_{DISCORD,SLACK,MATTERMOST}_BOT_TOKEN) and
    // env-defined message profile tokens (MESSAGE_PROFILE_*_BOT_TOKEN) are also
    // honored by the validator via passthrough(); clear any that leaked in.
    for (const key of Object.keys(process.env)) {
      if (
        key.startsWith('BOTS_') &&
        (key.endsWith('_DISCORD_BOT_TOKEN') ||
          key.endsWith('_SLACK_BOT_TOKEN') ||
          key.endsWith('_MATTERMOST_TOKEN'))
      ) {
        delete process.env[key];
      }
      if (/^MESSAGE_PROFILE_[A-Z0-9]+_(BOT_TOKEN|TOKEN)$/.test(key)) {
        delete process.env[key];
      }
    }
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

    it('should pass without messaging tokens when SKIP_MESSENGERS=true (WebUI-only mode)', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      delete process.env.SLACK_BOT_TOKEN;
      delete process.env.MATTERMOST_TOKEN;
      process.env.SKIP_MESSENGERS = 'true';

      expect(() => validateRequiredEnvVars()).not.toThrow();
      delete process.env.SKIP_MESSENGERS;
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

    it('should pass if an env-defined message profile token is provided', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'profile-token';
      expect(() => validateRequiredEnvVars()).not.toThrow();
      delete process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN;
    });

    it('should pass if an env-defined message profile TOKEN (mattermost-style) is provided', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.MESSAGE_PROFILE_MMMAIN_TOKEN = 'profile-token';
      expect(() => validateRequiredEnvVars()).not.toThrow();
      delete process.env.MESSAGE_PROFILE_MMMAIN_TOKEN;
    });

    it('should not accept an empty env-defined message profile token', () => {
      delete process.env.DISCORD_BOT_TOKEN;
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = '   ';
      expect(() => validateRequiredEnvVars()).toThrow(/at least one messaging platform token/);
      delete process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN;
    });

    it('should throw if FORCE_TRUSTED_LOGIN=true in production', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      expect(() => validateRequiredEnvVars()).toThrow(
        /FORCE_TRUSTED_LOGIN cannot be used in production/
      );
    });

    it('should throw if DISABLE_ENCRYPTION=true in production', () => {
      process.env.DISABLE_ENCRYPTION = 'true';
      expect(() => validateRequiredEnvVars()).toThrow(
        /DISABLE_ENCRYPTION cannot be used in production/
      );
    });

    it('refuses FORCE_TRUSTED_LOGIN even when ALLOW_INSECURE_PRODUCTION=true', () => {
      process.env.ALLOW_INSECURE_PRODUCTION = 'true';
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      // Missing secrets would otherwise be allowed; dangerous flags still fail closed.
      delete process.env.OPENAI_API_KEY;
      delete process.env.SESSION_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.HIVEMIND_PLUGIN_SIGNING_KEY;
      delete process.env.DISCORD_BOT_TOKEN;
      expect(() => validateRequiredEnvVars()).toThrow(
        /FORCE_TRUSTED_LOGIN cannot be used in production/
      );
    });

    it('refuses DISABLE_ENCRYPTION even when ALLOW_INSECURE_PRODUCTION=true', () => {
      process.env.ALLOW_INSECURE_PRODUCTION = 'true';
      process.env.DISABLE_ENCRYPTION = 'true';
      delete process.env.OPENAI_API_KEY;
      delete process.env.SESSION_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.ADMIN_PASSWORD;
      delete process.env.HIVEMIND_PLUGIN_SIGNING_KEY;
      delete process.env.DISCORD_BOT_TOKEN;
      expect(() => validateRequiredEnvVars()).toThrow(
        /DISABLE_ENCRYPTION cannot be used in production/
      );
    });
  });

  it('should log errors to Logger before throwing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_PASSWORD;

    expect(() => validateRequiredEnvVars()).toThrow();
    expect(Logger.error).toHaveBeenCalled();
  });
});
