import { InputSanitizer, RateLimiter } from '@src/utils/InputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeMessage', () => {
    test('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script>world';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Hello world');
    });

    test('should remove javascript: protocols', () => {
      const input = 'Click [here](javascript:alert("xss"))';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Click [here](alert("xss"))');
    });

    test('should remove HTML tags', () => {
      const input = '<b>Bold</b> <i>Italic</i>';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Bold Italic');
    });

    test('should remove null bytes and control characters', () => {
      const input = 'Hello\0world\x1F';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Helloworld');
    });

    test('should trim whitespace', () => {
      const input = '   hello world   ';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('hello world');
    });

    test('should limit length to 10000 characters', () => {
      const input = 'a'.repeat(10001);
      expect(InputSanitizer.sanitizeMessage(input).length).toBe(10000);
    });

    test('should return empty string for non-string input', () => {
      expect(InputSanitizer.sanitizeMessage(null as any)).toBe('');
      expect(InputSanitizer.sanitizeMessage(undefined as any)).toBe('');
    });
  });

  describe('sanitizeUserId', () => {
    test('should allow valid user IDs', () => {
      expect(InputSanitizer.sanitizeUserId('user_123.test-name')).toBe('user_123.test-name');
    });

    test('should remove invalid characters', () => {
      expect(InputSanitizer.sanitizeUserId('user!@#')).toBe('user');
    });

    test('should return null for empty or too long IDs', () => {
      expect(InputSanitizer.sanitizeUserId('')).toBeNull();
      expect(InputSanitizer.sanitizeUserId('a'.repeat(101))).toBeNull();
    });

    test('should return null for non-string input', () => {
      expect(InputSanitizer.sanitizeUserId(null as any)).toBeNull();
    });
  });

  describe('sanitizeChannelId', () => {
    test('should allow valid channel IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('channel.123_test')).toBe('channel.123_test');
    });

    test('should remove invalid characters', () => {
      expect(InputSanitizer.sanitizeChannelId('chan#nel$')).toBe('channel');
    });

    test('should return null for empty or too long IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('')).toBeNull();
      expect(InputSanitizer.sanitizeChannelId('a'.repeat(101))).toBeNull();
    });
  });

  describe('validateMessage', () => {
    test('should validate correct message', () => {
      const result = InputSanitizer.validateMessage('Hello world');
      expect(result.isValid).toBe(true);
    });

    test('should reject empty or required content', () => {
      expect(InputSanitizer.validateMessage('').isValid).toBe(false);
      expect(InputSanitizer.validateMessage('   ').isValid).toBe(false);
      expect(InputSanitizer.validateMessage(null as any).isValid).toBe(false);
    });

    test('should reject too long content', () => {
      const input = 'a'.repeat(10001);
      const result = InputSanitizer.validateMessage(input);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Content is too long');
    });

    test('should reject excessive special characters', () => {
      const input = '!!!!!!!!!!';
      const result = InputSanitizer.validateMessage(input);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Too many special characters');
    });
  });

  describe('stripSurroundingQuotes', () => {
    test('should remove matching pairs of quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('"Hello"')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes("'Hello'")).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('“Hello”')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('‘Hello’')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('«Hello»')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('`Hello`')).toBe('Hello');
    });

    test('should remove nested matching quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('"`Hello`"')).toBe('Hello');
    });

    test('should greedily strip unmatched quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('"Hello')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('Hello"')).toBe('Hello');
      expect(InputSanitizer.stripSurroundingQuotes('“Hello')).toBe('Hello');
    });

    test('should handle empty input', () => {
      expect(InputSanitizer.stripSurroundingQuotes('')).toBe('');
    });
  });

  describe('sanitizeConfigValue', () => {
    test('should sanitize string values', () => {
      expect(InputSanitizer.sanitizeConfigValue('  test  ', 'string')).toBe('test');
      expect(InputSanitizer.sanitizeConfigValue(123, 'string')).toBeNull();
    });

    test('should sanitize number values', () => {
      expect(InputSanitizer.sanitizeConfigValue('123', 'number')).toBe(123);
      expect(InputSanitizer.sanitizeConfigValue('abc', 'number')).toBeNull();
    });

    test('should sanitize boolean values', () => {
      expect(InputSanitizer.sanitizeConfigValue(true, 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue('true', 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue('TRUE', 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue('false', 'boolean')).toBe(false);
      expect(InputSanitizer.sanitizeConfigValue(1, 'boolean')).toBeNull();
    });
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clearAll();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should allow requests within limit', () => {
    const identifier = 'user-1';
    expect(RateLimiter.checkLimit(identifier, 3, 1000)).toBe(true);
    expect(RateLimiter.checkLimit(identifier, 3, 1000)).toBe(true);
    expect(RateLimiter.checkLimit(identifier, 3, 1000)).toBe(true);
  });

  test('should reject requests exceeding limit', () => {
    const identifier = 'user-2';
    RateLimiter.checkLimit(identifier, 2, 1000);
    RateLimiter.checkLimit(identifier, 2, 1000);
    expect(RateLimiter.checkLimit(identifier, 2, 1000)).toBe(false);
  });

  test('should reset after window expires', () => {
    const identifier = 'user-3';
    const windowMs = 1000;
    RateLimiter.checkLimit(identifier, 1, windowMs);
    expect(RateLimiter.checkLimit(identifier, 1, windowMs)).toBe(false);

    // Using any to avoid TS error if jest is not fully typed in this env
    (jest as any).advanceTimersByTime(windowMs + 1);
    expect(RateLimiter.checkLimit(identifier, 1, windowMs)).toBe(true);
  });

  test('should return correct remaining attempts', () => {
    const identifier = 'user-4';
    expect(RateLimiter.getRemainingAttempts(identifier, 5)).toBe(5);
    RateLimiter.checkLimit(identifier, 5, 1000);
    expect(RateLimiter.getRemainingAttempts(identifier, 5)).toBe(4);
  });

  test('should clear limit for an identifier', () => {
    const identifier = 'user-5';
    RateLimiter.checkLimit(identifier, 1, 1000);
    expect(RateLimiter.checkLimit(identifier, 1, 1000)).toBe(false);
    RateLimiter.clearLimit(identifier);
    expect(RateLimiter.checkLimit(identifier, 1, 1000)).toBe(true);
  });

  test('should return accurate stats', () => {
    RateLimiter.checkLimit('u1', 10, 1000);
    RateLimiter.checkLimit('u2', 10, 1000);
    RateLimiter.checkLimit('u2', 10, 1000);

    const stats = RateLimiter.getStats();
    expect(stats.identifiersCount).toBe(2);
    expect(stats.totalAttempts).toBe(3);
  });

  test('should enforce MAX_ATTEMPTS_PER_IDENTIFIER', () => {
    const identifier = 'user-unbounded';
    for (let i = 0; i < 150; i++) {
      RateLimiter.checkLimit(identifier, 200, 10000);
    }
    const stats = RateLimiter.getStats();
    expect(stats.totalAttempts).toBe(100); // capped by default MAX_ATTEMPTS_PER_IDENTIFIER
  });

  test('should enforce MAX_IDENTIFIERS limit', () => {
    // We need to isolate this test because MAX_IDENTIFIERS is a static readonly property
    jest.isolateModules(() => {
      process.env.RATE_LIMITER_MAX_IDENTIFIERS = '5';
      // Using root-relative path for require to be safe across environments
      const { RateLimiter: IsolatedRateLimiter } = require('../../../src/utils/InputSanitizer');

      IsolatedRateLimiter.clearAll();

      // Add 5 identifiers
      for (let i = 1; i <= 5; i++) {
        IsolatedRateLimiter.checkLimit(`user-${i}`, 10, 60000);
        (jest as any).advanceTimersByTime(1000);
      }

      expect(IsolatedRateLimiter.getStats().identifiersCount).toBe(5);

      // Add one more identifier, should trigger enforcement
      IsolatedRateLimiter.checkLimit('user-6', 10, 60000);

      // enforceMaxIdentifiers removes Math.ceil(MAX_IDENTIFIERS * 0.1) entries
      // 5 * 0.1 = 0.5, ceil(0.5) = 1.
      expect(IsolatedRateLimiter.getStats().identifiersCount).toBe(5);

      const initialCount = IsolatedRateLimiter.getStats().identifiersCount;
      IsolatedRateLimiter.clearLimit('user-1');
      expect(IsolatedRateLimiter.getStats().identifiersCount).toBe(initialCount);

      IsolatedRateLimiter.clearLimit('user-2');
      expect(IsolatedRateLimiter.getStats().identifiersCount).toBe(initialCount - 1);
    });
  });
});
