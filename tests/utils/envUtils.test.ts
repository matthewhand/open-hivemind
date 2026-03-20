import {
  redactSensitiveValue,
  checkEnvOverride,
  getRelevantEnvVars,
  checkBotEnvOverrides,
} from '../../src/utils/envUtils';

describe('envUtils', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('redactSensitiveValue', () => {
    it('should fully redact values with length <= 8', () => {
      expect(redactSensitiveValue('12345678')).toBe('********');
      expect(redactSensitiveValue('abc')).toBe('***');
    });

    it('should partially redact values with length > 8', () => {
      expect(redactSensitiveValue('123456789')).toBe('1234****6789');
      expect(redactSensitiveValue('thisisalongsecret')).toBe('this****cret');
    });

    it('should handle empty or null values', () => {
      expect(redactSensitiveValue('')).toBe('');
      expect(redactSensitiveValue(null as any)).toBe('');
      expect(redactSensitiveValue(undefined as any)).toBe('');
    });
  });

  describe('checkEnvOverride', () => {
    it('should return isOverridden: false when env var is not set', () => {
      delete process.env.TEST_VAR;
      const result = checkEnvOverride('TEST_VAR');
      expect(result).toEqual({ isOverridden: false });
    });

    it('should return isOverridden: true and values when env var is set (long value)', () => {
      process.env.TEST_VAR = 'some-long-value';
      const result = checkEnvOverride('TEST_VAR');
      expect(result).toEqual({
        isOverridden: true,
        rawValue: 'some-long-value',
        redactedValue: 'some****alue',
      });
    });

    it('should return isOverridden: true and values when env var is set (short value)', () => {
      process.env.TEST_VAR = 'short';
      const result = checkEnvOverride('TEST_VAR');
      expect(result).toEqual({
        isOverridden: true,
        rawValue: 'short',
        redactedValue: '*****',
      });
    });
  });

  describe('getRelevantEnvVars', () => {
    it('should return relevant env vars and redact sensitive ones', () => {
      process.env = {
        BOTS_MYBOT_TOKEN: 'secret-token-long',
        PORT: '3000',
        OTHER_VAR: 'not-relevant',
      };

      const result = getRelevantEnvVars();

      expect(result.BOTS_MYBOT_TOKEN).toBe('secr****long');
      expect(result.PORT).toBe('3000');
      expect(result.OTHER_VAR).toBeUndefined();
    });

    it('should handle non-sensitive relevant env vars', () => {
      process.env = {
        LOG_LEVEL: 'debug',
      };
      const result = getRelevantEnvVars();
      expect(result.LOG_LEVEL).toBe('debug');
    });
  });

  describe('checkBotEnvOverrides', () => {
    it('should return overrides for a specific bot', () => {
      const botName = 'TestBot';
      process.env.BOTS_TESTBOT_LLM_PROVIDER = 'openai';
      process.env.BOTS_TESTBOT_OPENAI_API_KEY = 'sk-1234567890abcdef';

      const result = checkBotEnvOverrides(botName);

      expect(result['BOTS_TESTBOT_LLM_PROVIDER']).toEqual({
        isOverridden: true,
        redactedValue: '******',
      });
      expect(result['BOTS_TESTBOT_OPENAI_API_KEY']).toEqual({
        isOverridden: true,
        redactedValue: 'sk-1****cdef',
      });
    });

    it('should return empty object if no overrides exist for the bot', () => {
      process.env = {};
      const result = checkBotEnvOverrides('NoOverridesBot');
      expect(result).toEqual({});
    });
  });
});
