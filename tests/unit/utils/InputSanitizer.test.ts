import { InputSanitizer } from '../../../src/utils/InputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeMessage', () => {
    it('should return empty string for invalid input', () => {
      expect(InputSanitizer.sanitizeMessage('')).toBe('');
      expect(InputSanitizer.sanitizeMessage(null as any)).toBe('');
      expect(InputSanitizer.sanitizeMessage(undefined as any)).toBe('');
      expect(InputSanitizer.sanitizeMessage(123 as any)).toBe('');
    });

    it('should remove script tags', () => {
      expect(InputSanitizer.sanitizeMessage('<script>alert(1)</script>hello')).toBe('hello');
    });

    it('should remove javascript: protocol', () => {
      expect(InputSanitizer.sanitizeMessage('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove HTML tags', () => {
      expect(InputSanitizer.sanitizeMessage('<b>bold</b> text')).toBe('bold text');
    });

    it('should remove control characters', () => {
      expect(InputSanitizer.sanitizeMessage('hello\x00world')).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      expect(InputSanitizer.sanitizeMessage('  hello  ')).toBe('hello');
    });

    it('should limit length to 10000', () => {
      const long = 'a'.repeat(15000);
      expect(InputSanitizer.sanitizeMessage(long).length).toBe(10000);
    });
  });

  describe('sanitizeUserId', () => {
    it('should return null for invalid input', () => {
      expect(InputSanitizer.sanitizeUserId('')).toBeNull();
      expect(InputSanitizer.sanitizeUserId(null as any)).toBeNull();
    });

    it('should allow alphanumeric, underscores, hyphens, and dots', () => {
      expect(InputSanitizer.sanitizeUserId('user_123')).toBe('user_123');
      expect(InputSanitizer.sanitizeUserId('user-123')).toBe('user-123');
      expect(InputSanitizer.sanitizeUserId('user.123')).toBe('user.123');
    });

    it('should remove invalid characters', () => {
      expect(InputSanitizer.sanitizeUserId('user@123!')).toBe('user123');
    });

    it('should return null for too long IDs', () => {
      expect(InputSanitizer.sanitizeUserId('a'.repeat(101))).toBeNull();
    });
  });

  describe('sanitizeChannelId', () => {
    it('should return null for invalid input', () => {
      expect(InputSanitizer.sanitizeChannelId('')).toBeNull();
      expect(InputSanitizer.sanitizeChannelId(null as any)).toBeNull();
    });

    it('should allow valid channel IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('channel_123')).toBe('channel_123');
    });

    it('should return null for too long IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('a'.repeat(101))).toBeNull();
    });
  });

  describe('validateMessage', () => {
    it('should reject empty content', () => {
      expect(InputSanitizer.validateMessage('')).toEqual({ isValid: false, reason: 'Content is required' });
    });

    it('should reject whitespace-only content', () => {
      expect(InputSanitizer.validateMessage('   ')).toEqual({ isValid: false, reason: 'Content cannot be empty' });
    });

    it('should reject too long content', () => {
      expect(InputSanitizer.validateMessage('a'.repeat(10001))).toEqual({ isValid: false, reason: 'Content is too long' });
    });

    it('should accept valid content', () => {
      expect(InputSanitizer.validateMessage('Hello world')).toEqual({ isValid: true });
    });
  });

  describe('sanitizeConfigValue', () => {
    it('should sanitize string values', () => {
      expect(InputSanitizer.sanitizeConfigValue('hello', 'string')).toBe('hello');
      expect(InputSanitizer.sanitizeConfigValue(123, 'string')).toBeNull();
    });

    it('should sanitize number values', () => {
      expect(InputSanitizer.sanitizeConfigValue(42, 'number')).toBe(42);
      expect(InputSanitizer.sanitizeConfigValue('not-a-number', 'number')).toBeNull();
    });

    it('should sanitize boolean values', () => {
      expect(InputSanitizer.sanitizeConfigValue(true, 'boolean')).toBe(true);
      expect(InputSanitizer.sanitizeConfigValue(false, 'boolean')).toBe(false);
      expect(InputSanitizer.sanitizeConfigValue('not-a-boolean', 'boolean')).toBe(false);
    });
  });
});
