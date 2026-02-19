/**
 * @fileoverview Tests for debugEnvVars module
 * @module tests/config/debugEnvVars.test
 * @description Comprehensive test suite for the debugEnvVars utility
 */

describe('debugEnvVars', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockDebug: jest.Mock;
  let mockRedactSensitiveInfo: jest.Mock;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Create mocks
    mockDebug = jest.fn();
    mockRedactSensitiveInfo = jest.fn((key: string, value: any) => {
      const sensitivePatterns = ['password', 'apikey', 'api_key', 'auth_token', 'secret', 'token', 'key'];
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitivePatterns.some(pattern => lowerKey.includes(pattern));

      if (!isSensitive) {
        return value === undefined || value === null ? '' : String(value);
      }

      const stringValue = value === undefined || value === null ? '' : String(value);
      if (stringValue.length === 0) {
        return '********';
      }

      if (stringValue.length <= 8) {
        const visible = stringValue.slice(-4);
        const redactionLength = Math.max(stringValue.length - visible.length, 4);
        return `${'*'.repeat(redactionLength)}${visible}`;
      }

      const start = stringValue.slice(0, 4);
      const end = stringValue.slice(-4);
      const middleLength = Math.max(stringValue.length - 8, 4);
      return `${start}${'*'.repeat(middleLength)}${end}`;
    });

    // Mock the debug module at the top level
    jest.mock('debug', () => jest.fn(() => mockDebug));

    // Mock the redactSensitiveInfo function
    jest.mock('../../src/common/redactSensitiveInfo', () => ({
      redactSensitiveInfo: mockRedactSensitiveInfo
    }));
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('environment variable logging', () => {
    beforeEach(() => {
      // Set up test environment variables
      process.env = {
        NORMAL_VAR: 'normal_value',
        ANOTHER_VAR: 'another_value',
        BOT_DEBUG_MODE: 'true',
        API_KEY: 'secret_api_key_12345',
        SECRET_KEY: 'super_secret_key',
        BOT_TOKEN: 'bot_token_12345',
        ACCESS_TOKEN: 'access_token_67890',
        JWT_SECRET: 'jwt_secret_123',
        DATABASE_SECRET: 'db_secret_456',
        DB_PASSWORD: 'database_password',
        USER_PASSWORD: 'user_password_123',
        EMPTY_VAR: '',
        UNDEFINED_VAR: undefined as any,
        api_key: 'lowercase_key_value',
        TOKEN_VALUE: 'TOKEN_VALUE_UPPER',
        jwt_secret: 'jwt_secret_lowercase'
      };
    });

    it('should log all environment variables', async () => {
      // Import the module after mocking
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');

      debugEnvVars();

      expect(mockDebug).toHaveBeenCalledWith('=== Environment Variables ===');

      // Check that normal variables are logged correctly
      expect(mockDebug).toHaveBeenCalledWith('NORMAL_VAR = normal_value');
      expect(mockDebug).toHaveBeenCalledWith('ANOTHER_VAR = another_value');

      // Check that UPPERCASE sensitive variables are SKIPPED (case-sensitive matching)
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: API_KEY');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: SECRET_KEY');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: BOT_TOKEN');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: ACCESS_TOKEN');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: JWT_SECRET');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: DATABASE_SECRET');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: DB_PASSWORD');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: USER_PASSWORD');
      // TOKEN_VALUE contains uppercase 'TOKEN' -> skipped
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: TOKEN_VALUE');
      // Note: lowercase api_key and jwt_secret are NOT skipped (case-sensitive matching)

      // Check that empty variables are handled
      expect(mockDebug).toHaveBeenCalledWith('EMPTY_VAR = ');
      expect(mockDebug).toHaveBeenCalledWith('UNDEFINED_VAR = ');

      // Check that BOT_DEBUG_MODE is skipped
      expect(mockDebug).not.toHaveBeenCalledWith(expect.stringContaining('BOT_DEBUG_MODE'));
    });

    it('should skip all types of sensitive variables', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');

      debugEnvVars();

      // Test KEY variables are SKIPPED (current implementation skips rather than redacts)
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: API_KEY');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: SECRET_KEY');

      // Test TOKEN variables
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: BOT_TOKEN');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: ACCESS_TOKEN');

      // Test SECRET variables
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: JWT_SECRET');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: DATABASE_SECRET');

      // Test PASSWORD variables
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: DB_PASSWORD');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: USER_PASSWORD');
    });

    it('should handle empty environment variables', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');

      debugEnvVars();

      expect(mockDebug).toHaveBeenCalledWith('EMPTY_VAR = ');
      expect(mockDebug).toHaveBeenCalledWith('UNDEFINED_VAR = ');
    });

    it('should skip variables with case-sensitive matching', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');

      debugEnvVars();

      // Implementation uses case-sensitive matching:
      // - TOKEN_VALUE contains 'TOKEN' -> skipped
      // - api_key does NOT contain 'KEY' (lowercase) -> logged as normal
      // - jwt_secret does NOT contain 'SECRET' (lowercase) -> logged as normal
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: TOKEN_VALUE');
    });
  });

  describe('required environment variable checking', () => {
    beforeEach(() => {
      // Reset environment for each test
      process.env = {};
    });

    it('should check for required variables for different providers', async () => {
      // Test Discord variables
      process.env.MESSAGE_PROVIDER = 'discord';
      let { debugEnvVars } = await import('../../src/config/debugEnvVars');
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_BOT_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_CLIENT_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_GUILD_ID is missing!');

      // Reset mocks and test Slack variables
      jest.clearAllMocks();
      process.env.MESSAGE_PROVIDER = 'slack';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_BOT_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_APP_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_SIGNING_SECRET is missing!');

      // Reset mocks and test OpenAI variables
      jest.clearAllMocks();
      process.env.LLM_PROVIDER = 'openai';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_API_KEY is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_BASE_URL is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_MODEL is missing!');

      // Reset mocks and test Flowise variables
      jest.clearAllMocks();
      process.env.LLM_PROVIDER = 'flowise';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_KEY is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_ENDPOINT is missing!');
    });

    it('should handle edge cases in required variable checking', async () => {
      // Test case-insensitive provider matching
      process.env.MESSAGE_PROVIDER = 'DISCORD';
      process.env.LLM_PROVIDER = 'OPENAI';
      let { debugEnvVars } = await import('../../src/config/debugEnvVars');
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_BOT_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_CLIENT_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_GUILD_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_API_KEY is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_BASE_URL is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_MODEL is missing!');

      // Reset and test skipping when no providers configured
      jest.clearAllMocks();
      process.env.MESSAGE_PROVIDER = '';
      process.env.LLM_PROVIDER = '';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).not.toHaveBeenCalledWith('=== Checking for Missing Required Environment Variables ===');

      // Reset and test not warning for present variables
      jest.clearAllMocks();
      process.env.MESSAGE_PROVIDER = 'discord';
      process.env.DISCORD_BOT_TOKEN = 'token123';
      process.env.DISCORD_CLIENT_ID = 'client123';
      process.env.DISCORD_GUILD_ID = 'guild123';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).not.toHaveBeenCalledWith(expect.stringContaining('WARNING: Required environment variable'));

      // Reset and test partial provider matches
      jest.clearAllMocks();
      delete process.env.DISCORD_BOT_TOKEN;
      delete process.env.DISCORD_CLIENT_ID;
      delete process.env.DISCORD_GUILD_ID;
      process.env.MESSAGE_PROVIDER = 'discord,slack';
      process.env.LLM_PROVIDER = 'openai,flowise';
      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      // Check that warnings are generated for missing variables (order may vary)
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_BOT_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_CLIENT_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_GUILD_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_BOT_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_APP_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_SIGNING_SECRET is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_API_KEY is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_BASE_URL is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable OPENAI_MODEL is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_KEY is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_ENDPOINT is missing!');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex integration scenarios', async () => {
      // Test multiple providers simultaneously
      process.env = {
        MESSAGE_PROVIDER: 'discord,slack',
        LLM_PROVIDER: 'openai,flowise',
        DISCORD_BOT_TOKEN: 'discord_token',
        OPENAI_API_KEY: 'openai_key'
        // Missing: DISCORD_CLIENT_ID, DISCORD_GUILD_ID, SLACK_BOT_TOKEN, etc.
      };

      let { debugEnvVars } = await import('../../src/config/debugEnvVars');
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('=== Environment Variables ===');
      expect(mockDebug).toHaveBeenCalledWith('MESSAGE_PROVIDER = discord,slack');
      expect(mockDebug).toHaveBeenCalledWith('LLM_PROVIDER = openai,flowise');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable DISCORD_CLIENT_ID is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_BOT_TOKEN is missing!');

      // Reset and test complex environment with mixed variables
      jest.clearAllMocks();
      process.env = {
        NORMAL_VAR: 'public_value',
        API_KEY: 'secret_api_key_12345',
        SLACK_BOT_TOKEN: 'slack_bot_token_123',
        FLOWISE_API_KEY: 'flowise_api_key_456',
        MESSAGE_PROVIDER: 'slack',
        LLM_PROVIDER: 'flowise'
      };

      ({ debugEnvVars } = await import('../../src/config/debugEnvVars'));
      debugEnvVars();
      expect(mockDebug).toHaveBeenCalledWith('NORMAL_VAR = public_value');
      // Sensitive variables are skipped, not logged with redacted values
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: API_KEY');
      expect(mockDebug).toHaveBeenCalledWith('Skipping sensitive variable: SLACK_BOT_TOKEN');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_APP_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_ENDPOINT is missing!');
    });
  });
});