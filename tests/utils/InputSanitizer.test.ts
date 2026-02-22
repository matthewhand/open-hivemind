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

    test('should prevent nested javascript: protocol evasion', () => {
      const input = 'java<script>script</script>:alert("xss")';
      expect(InputSanitizer.sanitizeMessage(input)).not.toContain('javascript:');
    });

    test('should prevent recursive replacement evasion', () => {
      const input = 'javajavascript:script:alert(1)';
      expect(InputSanitizer.sanitizeMessage(input)).not.toContain('javascript:');
    });

    test('should handle complex nested obfuscation', () => {
      const input = 'javajavajavascript:script:script:alert(1)';
      expect(InputSanitizer.sanitizeMessage(input)).not.toContain('javascript:');
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
      expect(InputSanitizer.sanitizeConfigValue(123, 'boolean')).toBeNull();
    });

    test('should return null for unknown type', () => {
      expect(InputSanitizer.sanitizeConfigValue('value', 'unknown' as any)).toBeNull();
    });
  });
});

describe('RateLimiter', () => {
  // Store original limits to restore them if needed, though clearAll is called
  // But configure changes static properties that persist.

  beforeEach(() => {
    RateLimiter.clearAll();
    RateLimiter.configure(10000, 100); // Reset to defaults
  });

  test('should allow requests within limit', () => {
    const id = 'user1';
    for (let i = 0; i < 10; i++) {
      expect(RateLimiter.checkLimit(id)).toBe(true);
    }
    expect(RateLimiter.checkLimit(id)).toBe(false);
  });

  test('should reset after window expires', async () => {
    const id = 'user2';
    const windowMs = 100;
    for (let i = 0; i < 10; i++) {
      RateLimiter.checkLimit(id, 10, windowMs);
    }
    expect(RateLimiter.checkLimit(id, 10, windowMs)).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 150));
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

  test('should enforce max identifiers limit', async () => {
    // Configure small limit
    RateLimiter.configure(3, 10);

    // Add 3 users
    RateLimiter.checkLimit('user1');
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure timestamps differ slightly
    RateLimiter.checkLimit('user2');
    await new Promise(resolve => setTimeout(resolve, 10));
    RateLimiter.checkLimit('user3');

    expect(RateLimiter.getStats().identifiersCount).toBe(3);

    // Add 4th user, should trigger eviction of oldest (user1)
    await new Promise(resolve => setTimeout(resolve, 10));
    RateLimiter.checkLimit('user4');

    const stats = RateLimiter.getStats();
    // Logic removes oldest 10% (ceil(3 * 0.1) = 1).
    // So 3 -> 2 + 1 = 3 again?
    // Wait.
    // enforceMaxIdentifiers:
    // if size < MAX (3), return.
    // when size is 3, it's NOT < 3? No, 3 < 3 is false.
    // So if size is 3 (max), it enters?
    // Code: `if (this.attempts.size < this.MAX_IDENTIFIERS) return;`
    // If size is 3 and MAX is 3, it proceeds.
    // toRemove = ceil(3 * 0.1) = 1.
    // Removes 1 entry.
    // Size becomes 2.
    // Then user4 is added? No, user4 was added just before check?
    // Wait, let's check order in `checkLimit`.
    // 1. Check existing.
    // 2. Add current attempt.
    // 3. Update map (sets identifier). Size increases to 4 (if new).
    // 4. Call enforceMaxIdentifiers.
    // 5. enforce sees size 4. MAX is 3. 4 < 3 is false. Proceeds.
    // 6. toRemove = ceil(3 * 0.1) = 1.
    // 7. Sorts by last attempt.
    // 8. Removes 1 oldest.
    // 9. Size becomes 3.

    expect(stats.identifiersCount).toBe(3);

    // Check if user1 (oldest) is gone
    // We can check by seeing if history is empty or if we can infer it.
    // getRemainingAttempts('user1') should be max (10) if it's cleared (treated as new).
    // But if we add it again it would be allowed.
    // Wait, `checkLimit` adds it.

    // We can verify user1 is gone by accessing the private map? No.
    // We can verify user1 is gone because `checkLimit` returns true?
    // If we had used up all attempts for user1, and it was cleared, we would have fresh attempts.

    // Let's use up attempts for user1.
    RateLimiter.configure(3, 2); // Max 2 attempts
    RateLimiter.clearAll();

    RateLimiter.checkLimit('user1', 2); // 1/2
    RateLimiter.checkLimit('user1', 2); // 2/2
    expect(RateLimiter.checkLimit('user1', 2)).toBe(false); // blocked

    await new Promise(resolve => setTimeout(resolve, 10));
    RateLimiter.checkLimit('user2', 2);
    await new Promise(resolve => setTimeout(resolve, 10));
    RateLimiter.checkLimit('user3', 2);

    // Now we have 3 users. user1 is blocked.
    // Add user4
    await new Promise(resolve => setTimeout(resolve, 10));
    RateLimiter.checkLimit('user4', 2);

    // user1 should have been evicted (oldest last attempt).
    // If user1 is evicted, it's forgotten.
    // If we check user1 again, it should be treated as new user -> allowed.

    expect(RateLimiter.checkLimit('user1', 2)).toBe(true);
  });
});
