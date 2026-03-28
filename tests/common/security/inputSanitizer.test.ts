import { InputSanitizer, sanitizeMessageText } from '../../../src/common/security/inputSanitizer';

describe('InputSanitizer', () => {
  describe('sanitizeText', () => {
    it('should return empty string for null/undefined', () => {
      expect(InputSanitizer.sanitizeText(null)).toBe('');
      expect(InputSanitizer.sanitizeText(undefined)).toBe('');
    });

    it('should strip script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should strip javascript: URLs', () => {
      const result = InputSanitizer.sanitizeText('click javascript:alert(1)');
      expect(result).not.toContain('javascript:');
    });

    it('should strip event handlers', () => {
      const result = InputSanitizer.sanitizeText('test onclick=doStuff()');
      expect(result).not.toContain('onclick=');
    });

    it('should truncate text exceeding maxLength', () => {
      const result = InputSanitizer.sanitizeText('a'.repeat(20000));
      // Default maxLength is 10000; after escaping the result should be limited
      expect(result.length).toBeLessThanOrEqual(11000); // allow for entity expansion
    });

    it('should normalize whitespace by default', () => {
      const result = InputSanitizer.sanitizeText('hello    world');
      expect(result).not.toContain('    ');
    });

    it('should escape HTML entities', () => {
      const result = InputSanitizer.sanitizeText('a & b', { stripScripts: false, allowHtml: true });
      expect(result).toContain('&amp;');
    });
  });

  describe('sanitizeName', () => {
    it('should return "Unknown User" for null/undefined', () => {
      expect(InputSanitizer.sanitizeName(null)).toBe('Unknown User');
      expect(InputSanitizer.sanitizeName(undefined)).toBe('Unknown User');
    });

    it('should sanitize names with HTML', () => {
      const result = InputSanitizer.sanitizeName('<b>Admin</b>');
      expect(result).not.toContain('<b>');
    });
  });

  describe('sanitizeEmail', () => {
    it('should return null for null/undefined', () => {
      expect(InputSanitizer.sanitizeEmail(null)).toBeNull();
      expect(InputSanitizer.sanitizeEmail(undefined)).toBeNull();
    });

    it('should return null for invalid emails', () => {
      expect(InputSanitizer.sanitizeEmail('not-an-email')).toBeNull();
    });
  });

  describe('sanitizeFileName', () => {
    it('should return "unknown_file" for null/undefined', () => {
      expect(InputSanitizer.sanitizeFileName(null)).toBe('unknown_file');
    });

    it('should remove path traversal patterns', () => {
      const result = InputSanitizer.sanitizeFileName('../../etc/passwd');
      expect(result).not.toContain('..');
    });

    it('should replace dangerous characters', () => {
      const result = InputSanitizer.sanitizeFileName('file:name?.txt');
      expect(result).not.toContain(':');
      expect(result).not.toContain('?');
    });
  });

  describe('sanitizeUserId', () => {
    it('should return "unknown" for null/undefined', () => {
      expect(InputSanitizer.sanitizeUserId(null)).toBe('unknown');
      expect(InputSanitizer.sanitizeUserId(undefined)).toBe('unknown');
    });

    it('should return "unknown" for empty string', () => {
      expect(InputSanitizer.sanitizeUserId('')).toBe('unknown');
      expect(InputSanitizer.sanitizeUserId('  ')).toBe('unknown');
    });

    it('should accept valid Slack user IDs', () => {
      expect(InputSanitizer.sanitizeUserId('U123ABC')).toBe('U123ABC');
      expect(InputSanitizer.sanitizeUserId('WABCD1234')).toBe('WABCD1234');
    });

    it('should reject invalid user ID formats', () => {
      expect(InputSanitizer.sanitizeUserId('invalid')).toBe('unknown');
      expect(InputSanitizer.sanitizeUserId('123')).toBe('unknown');
    });
  });

  describe('sanitizeChannelId', () => {
    it('should return empty string for null/undefined', () => {
      expect(InputSanitizer.sanitizeChannelId(null)).toBe('');
      expect(InputSanitizer.sanitizeChannelId(undefined)).toBe('');
    });

    it('should accept valid Slack channel IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('C12345678')).toBe('C12345678');
      expect(InputSanitizer.sanitizeChannelId('D12345678')).toBe('D12345678');
      expect(InputSanitizer.sanitizeChannelId('G12345678')).toBe('G12345678');
    });

    it('should reject invalid channel IDs', () => {
      expect(InputSanitizer.sanitizeChannelId('invalid')).toBe('');
      expect(InputSanitizer.sanitizeChannelId('X12345678')).toBe('');
    });
  });

  describe('sanitizeChannelContent', () => {
    it('should return empty string for null/undefined', () => {
      expect(InputSanitizer.sanitizeChannelContent(null)).toBe('');
    });

    it('should handle large content', () => {
      const result = InputSanitizer.sanitizeChannelContent('a'.repeat(60000));
      // maxLength is 50000, so it should be truncated
      expect(result.length).toBeLessThanOrEqual(55000);
    });
  });
});

describe('sanitizeMessageText', () => {
  it('should sanitize message text', () => {
    const result = sanitizeMessageText('Hello <script>bad</script> world');
    expect(result).not.toContain('<script');
  });

  it('should return empty string for null', () => {
    expect(sanitizeMessageText(null)).toBe('');
  });
});
