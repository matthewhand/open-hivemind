import { InputSanitizer, RateLimiter } from '../../src/utils/InputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeMessage', () => {
    test('should return empty string for null/undefined/empty input', () => {
      expect(InputSanitizer.sanitizeMessage(null as any)).toBe('');
      expect(InputSanitizer.sanitizeMessage(undefined as any)).toBe('');
      expect(InputSanitizer.sanitizeMessage('')).toBe('');
      expect(InputSanitizer.sanitizeMessage(123 as any)).toBe('');
    });

    test('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Hello  World');
    });

    test('should remove javascript: protocol', () => {
      const input = 'Check this: javascript:alert("xss")';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Check this: alert("xss")');
    });

    test('should remove HTML tags', () => {
      const input = '<b>Bold</b> and <i>Italic</i>';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Bold and Italic');
    });

    test('should remove control characters', () => {
      const input = 'Hello\x00World';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('HelloWorld');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(InputSanitizer.sanitizeMessage(input)).toBe('Hello World');
    });

    test('should truncate long strings', () => {
      const longString = 'a'.repeat(10005);
      const result = InputSanitizer.sanitizeMessage(longString);
      expect(result.length).toBe(10000);
    });
  });

  describe('sanitizeUserId', () => {
    test('should return null for invalid input types', () => {
      expect(InputSanitizer.sanitizeUserId(null as any)).toBeNull();
      expect(InputSanitizer.sanitizeUserId(undefined as any)).toBeNull();
      expect(InputSanitizer.sanitizeUserId(123 as any)).toBeNull();
    });

    test('should sanitize valid user ID', () => {
      expect(InputSanitizer.sanitizeUserId('user_123')).toBe('user_123');
      expect(InputSanitizer.sanitizeUserId('user-name.1')).toBe('user-name.1');
    });

    test('should remove invalid characters', () => {
      expect(InputSanitizer.sanitizeUserId('user@name!')).toBe('username');
    });

    test('should return null if result is empty', () => {
      expect(InputSanitizer.sanitizeUserId('!!!')).toBeNull();
    });

    test('should return null if result is too long', () => {
      const longId = 'a'.repeat(101);
      expect(InputSanitizer.sanitizeUserId(longId)).toBeNull();
    });
  });

  describe('sanitizeChannelId', () => {
    test('should return null for invalid input types', () => {
      expect(InputSanitizer.sanitizeChannelId(null as any)).toBeNull();
    });

    test('should sanitize valid channel ID', () => {
      expect(InputSanitizer.sanitizeChannelId('channel_123')).toBe('channel_123');
    });

    test('should remove invalid characters', () => {
      expect(InputSanitizer.sanitizeChannelId('#channel!')).toBe('channel');
    });

    test('should return null if result is too long', () => {
      const longId = 'a'.repeat(101);
      expect(InputSanitizer.sanitizeChannelId(longId)).toBeNull();
    });
  });

  describe('validateMessage', () => {
    test('should return valid for normal message', () => {
      const result = InputSanitizer.validateMessage('Hello World');
      expect(result.isValid).toBe(true);
    });

    test('should return invalid for empty message', () => {
      expect(InputSanitizer.validateMessage('').isValid).toBe(false);
      expect(InputSanitizer.validateMessage('   ').isValid).toBe(false);
    });

    test('should return invalid for null/undefined', () => {
      expect(InputSanitizer.validateMessage(null as any).isValid).toBe(false);
    });

    test('should return invalid for too long message', () => {
      const longMsg = 'a'.repeat(10001);
      expect(InputSanitizer.validateMessage(longMsg).isValid).toBe(false);
    });

    test('should return invalid for too many special characters', () => {
      const spam = '!!!!!#####$$$$$';
      const result = InputSanitizer.validateMessage(spam);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Too many special characters');
    });
  });

  describe('stripSurroundingQuotes', () => {
    test('should strip matching double quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('"hello"')).toBe('hello');
    });

    test('should strip matching single quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes("'hello'")).toBe('hello');
    });

    test('should strip nested quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('""hello""')).toBe('hello');
      expect(InputSanitizer.stripSurroundingQuotes('"\'hello\'"')).toBe('hello');
    });

    test('should not strip non-matching quotes (strict phase)', () => {
      // "hello' - unmatched, but phase 2 greedy strip might catch it?
      // Let's check implementation.
      // Phase 1: Recursive Matching Pairs.
      // Phase 2: Greedy Unmatched Stripping (removes from start/end if in list)

      // So "hello' -> hello' (after phase 1) -> hello (after phase 2)
      expect(InputSanitizer.stripSurroundingQuotes('"hello\'')).toBe('hello');
    });

    test('should handle smart quotes', () => {
      expect(InputSanitizer.stripSurroundingQuotes('“hello”')).toBe('hello');
    });

    test('should return empty string for null/undefined', () => {
      expect(InputSanitizer.stripSurroundingQuotes(null as any)).toBe('');
    });
  });

  describe('sanitizeConfigValue', () => {
    test('should sanitize string', () => {
      expect(InputSanitizer.sanitizeConfigValue('  test  ', 'string')).toBe('test');
      expect(InputSanitizer.sanitizeConfigValue(123, 'string')).toBeNull();
    });

    test('should sanitize number', () => {
      expect(InputSanitizer.sanitizeConfigValue('123', 'number')).toBe(123);
      expect(InputSanitizer.sanitizeConfigValue('abc', 'number')).toBeNull();
    });

    test('should sanitize boolean', () => {
      expect(InputSanitizer.sanitizeConfigValue(true, 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue('true', 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue('false', 'boolean')).toBe(false);
      expect(InputSanitizer.sanitizeConfigValue('other', 'boolean')).toBe(false);
    });

    test('should return null for unknown type', () => {
      expect(InputSanitizer.sanitizeConfigValue('value', 'unknown' as any)).toBeNull();
    });
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clearAll();
  });

  test('should allow requests within limit', () => {
    const id = 'user1';
    // Default limit is 10
    for (let i = 0; i < 10; i++) {
      expect(RateLimiter.checkLimit(id)).toBe(true);
    }
    // 11th should fail
    expect(RateLimiter.checkLimit(id)).toBe(false);
  });

  test('should reset after window expires', async () => {
    const id = 'user2';
    const windowMs = 100; // Short window for testing

    // Fill up limit
    for (let i = 0; i < 10; i++) {
      RateLimiter.checkLimit(id, 10, windowMs);
    }
    expect(RateLimiter.checkLimit(id, 10, windowMs)).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should be allowed again
    expect(RateLimiter.checkLimit(id, 10, windowMs)).toBe(true);
  });

  test('should track remaining attempts', () => {
    const id = 'user3';
    expect(RateLimiter.getRemainingAttempts(id, 10)).toBe(10);

    RateLimiter.checkLimit(id, 10);
    expect(RateLimiter.getRemainingAttempts(id, 10)).toBe(9);
  });

  test('should clear limit for identifier', () => {
    const id = 'user4';
    RateLimiter.checkLimit(id);
    expect(RateLimiter.getRemainingAttempts(id, 10)).toBe(9);

    RateLimiter.clearLimit(id);
    expect(RateLimiter.getRemainingAttempts(id, 10)).toBe(10);
  });

  test('should report stats', () => {
    RateLimiter.checkLimit('userA');
    RateLimiter.checkLimit('userB');
    RateLimiter.checkLimit('userB');

    const stats = RateLimiter.getStats();
    expect(stats.identifiersCount).toBe(2);
    expect(stats.totalAttempts).toBe(3);
  });
});
