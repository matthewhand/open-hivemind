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
    mockRedactSensitiveInfo = jest.fn((value: string, charsToShow: number) => {
      if (!value) return '';
      if (value.length <= charsToShow) return '*'.repeat(value.length);
      return value.substring(0, charsToShow) + '*'.repeat(Math.max(0, value.length - charsToShow));
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
      
      // Check that sensitive variables are redacted
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('API_KEY = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('SECRET_KEY = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('BOT_TOKEN = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('ACCESS_TOKEN = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('DATABASE_SECRET = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('DB_PASSWORD = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('USER_PASSWORD = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('api_key = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('TOKEN_VALUE = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('jwt_secret = '));
      
      // Check that empty variables are handled
      expect(mockDebug).toHaveBeenCalledWith('EMPTY_VAR = ');
      expect(mockDebug).toHaveBeenCalledWith('UNDEFINED_VAR = ');
      
      // Check that BOT_DEBUG_MODE is skipped
      expect(mockDebug).not.toHaveBeenCalledWith(expect.stringContaining('BOT_DEBUG_MODE'));
    });

    it('should redact all types of sensitive variables', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');

      debugEnvVars();

      // Test KEY variables
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('secret_api_key_12345', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('super_secret_key', 4);

      // Test TOKEN variables
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('bot_token_12345', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('access_token_67890', 4);

      // Test SECRET variables
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('jwt_secret_123', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('db_secret_456', 4);

      // Test PASSWORD variables
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('database_password', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('user_password_123', 4);
    });

    it('should handle empty environment variables', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');
      
      debugEnvVars();

      expect(mockDebug).toHaveBeenCalledWith('EMPTY_VAR = ');
      expect(mockDebug).toHaveBeenCalledWith('UNDEFINED_VAR = ');
    });

    it('should handle case-insensitive sensitive variable detection', async () => {
      const { debugEnvVars } = await import('../../src/config/debugEnvVars');
      
      debugEnvVars();

      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('lowercase_key_value', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('TOKEN_VALUE_UPPER', 4);
      expect(mockRedactSensitiveInfo).toHaveBeenCalledWith('jwt_secret_lowercase', 4);
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
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('API_KEY = '));
      expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('SLACK_BOT_TOKEN = '));
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable SLACK_APP_TOKEN is missing!');
      expect(mockDebug).toHaveBeenCalledWith('WARNING: Required environment variable FLOWISE_API_ENDPOINT is missing!');
    });
  });
});