import {
  checkBotEnvOverrides,
  checkEnvOverride,
  getRelevantEnvVars,
  redactSensitiveValue,
} from '@src/utils/envUtils';

describe('envUtils', () => {
  describe('redactSensitiveValue', () => {
    it('fully redacts short values (8 chars or fewer)', () => {
      expect(redactSensitiveValue('abcd')).toBe('****');
      expect(redactSensitiveValue('12345678')).toBe('********');
    });

    it('shows first 4 and last 4 chars for longer values', () => {
      expect(redactSensitiveValue('abcdefghij')).toBe('abcd****ghij');
    });

    it('returns empty stars for empty string', () => {
      expect(redactSensitiveValue('')).toBe('');
    });
  });

  describe('checkEnvOverride', () => {
    const ENV_KEY = 'TEST_ENVUTILS_KEY';

    afterEach(() => {
      delete process.env[ENV_KEY];
    });

    it('returns isOverridden false when env var is not set', () => {
      const result = checkEnvOverride(ENV_KEY);
      expect(result.isOverridden).toBe(false);
      expect(result.redactedValue).toBeUndefined();
    });

    it('returns isOverridden true with redacted value when set', () => {
      process.env[ENV_KEY] = 'my-secret-value-1234';
      const result = checkEnvOverride(ENV_KEY);
      expect(result.isOverridden).toBe(true);
      expect(result.redactedValue).toBe('my-s****1234');
      expect(result.rawValue).toBe('my-secret-value-1234');
    });
  });

  describe('getRelevantEnvVars', () => {
    afterEach(() => {
      delete process.env.BOTS_TESTBOT_NAME;
      delete process.env.DISCORD_CHANNEL;
      delete process.env.OPENAI_API_KEY;
      delete process.env.PORT;
      delete process.env.IRRELEVANT_VAR;
    });

    it('returns env vars with matching prefixes', () => {
      process.env.BOTS_TESTBOT_NAME = 'bot1';
      process.env.DISCORD_CHANNEL = 'general';
      const result = getRelevantEnvVars();
      expect(result['BOTS_TESTBOT_NAME']).toBe('bot1');
      expect(result['DISCORD_CHANNEL']).toBe('general');
    });

    it('returns exact-match keys', () => {
      process.env.PORT = '3000';
      const result = getRelevantEnvVars();
      expect(result['PORT']).toBe('3000');
    });

    it('redacts values containing KEY, SECRET, or TOKEN', () => {
      process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
      const result = getRelevantEnvVars();
      expect(result['OPENAI_API_KEY']).not.toBe('sk-1234567890abcdef');
      expect(result['OPENAI_API_KEY']).toContain('****');
    });

    it('excludes irrelevant env vars', () => {
      process.env.IRRELEVANT_VAR = 'nope';
      const result = getRelevantEnvVars();
      expect(result['IRRELEVANT_VAR']).toBeUndefined();
    });
  });

  describe('checkBotEnvOverrides', () => {
    afterEach(() => {
      delete process.env.BOTS_MYBOT_MESSAGE_PROVIDER;
      delete process.env.BOTS_MYBOT_DISCORD_BOT_TOKEN;
    });

    it('returns overrides for set bot env vars', () => {
      process.env.BOTS_MYBOT_MESSAGE_PROVIDER = 'discord';
      const result = checkBotEnvOverrides('mybot');
      expect(result['BOTS_MYBOT_MESSAGE_PROVIDER']).toBeDefined();
      expect(result['BOTS_MYBOT_MESSAGE_PROVIDER'].isOverridden).toBe(true);
    });

    it('returns empty object when no bot env vars are set', () => {
      const result = checkBotEnvOverrides('nonexistent');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });
});
