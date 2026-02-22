import {
  sanitizeValue,
  sanitizeObject,
  ValidationPatterns,
  SanitizationOptions
} from '@src/validation/inputValidator';

describe('Input Validator', () => {
  describe('sanitizeValue', () => {
    it('should return non-string values as is', () => {
      expect(sanitizeValue(123 as any)).toBe(123);
      expect(sanitizeValue(null as any)).toBe(null);
      expect(sanitizeValue(undefined as any)).toBe(undefined);
      expect(sanitizeValue({} as any)).toEqual({});
    });

    it('should return string as is with no options', () => {
      expect(sanitizeValue('test')).toBe('test');
    });

    it('should trim string when trim option is true', () => {
      expect(sanitizeValue(' test ', { trim: true })).toBe('test');
    });

    it('should lowercase string when lowercase option is true', () => {
      expect(sanitizeValue('TEST', { lowercase: true })).toBe('test');
    });

    it('should uppercase string when uppercase option is true', () => {
      expect(sanitizeValue('test', { uppercase: true })).toBe('TEST');
    });

    it('should remove null characters when removeNull option is true', () => {
      expect(sanitizeValue('te\0st', { removeNull: true })).toBe('test');
    });

    it('should strip HTML tags when stripHtml option is true', () => {
      expect(sanitizeValue('<p>test</p>', { stripHtml: true })).toBe('test');
      expect(sanitizeValue('<script>alert("xss")</script>', { stripHtml: true })).toBe('');
    });

    it('should escape HTML characters when escapeHtml option is true', () => {
      expect(sanitizeValue('<p>test</p>', { escapeHtml: true })).toBe('&lt;p&gt;test&lt;/p&gt;');
      expect(sanitizeValue('"test"', { escapeHtml: true })).toBe('&quot;test&quot;');
      expect(sanitizeValue("'test'", { escapeHtml: true })).toBe('&#x27;test&#x27;');
    });

    it('should truncate string to maxLength', () => {
      expect(sanitizeValue('testing', { maxLength: 4 })).toBe('test');
    });

    it('should apply multiple options', () => {
      expect(sanitizeValue(' <P>TEST</P> ', {
        trim: true,
        lowercase: true,
        stripHtml: true,
        maxLength: 4
      })).toBe('test');
    });
  });

  describe('sanitizeObject', () => {
    it('should return null or undefined as is', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should sanitize string value', () => {
      expect(sanitizeObject(' test ', { trim: true })).toBe('test');
    });

    it('should sanitize array of strings', () => {
      expect(sanitizeObject([' test ', ' abc '], { trim: true })).toEqual(['test', 'abc']);
    });

    it('should sanitize object values', () => {
      const input = { name: ' test ', age: 30 };
      const expected = { name: 'test', age: 30 };
      expect(sanitizeObject(input, { trim: true })).toEqual(expected);
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: ' test ',
          details: {
            bio: '<p>bio</p>'
          }
        }
      };
      const expected = {
        user: {
          name: 'test',
          details: {
            bio: 'bio'
          }
        }
      };
      expect(sanitizeObject(input, { trim: true, stripHtml: true })).toEqual(expected);
    });

    it('should sanitize keys', () => {
        const input = { ' <b>key</b> ': 'value' };
        // sanitizeObject sanitizes keys with stripHtml: true
        const expected = { ' key ': 'value' };
        expect(sanitizeObject(input)).toEqual(expected);
    });
  });

  describe('ValidationPatterns', () => {
    it('should validate email', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true);
      expect(ValidationPatterns.email.test('invalid-email')).toBe(false);
      expect(ValidationPatterns.email.test('test@.com')).toBe(false);
    });

    it('should validate url', () => {
      expect(ValidationPatterns.url.test('https://example.com')).toBe(true);
      expect(ValidationPatterns.url.test('http://example.com')).toBe(true);
      expect(ValidationPatterns.url.test('ftp://example.com')).toBe(false);
      expect(ValidationPatterns.url.test('invalid-url')).toBe(false);
    });

    it('should validate safeString', () => {
      expect(ValidationPatterns.safeString.test('valid-string_123')).toBe(true);
      expect(ValidationPatterns.safeString.test('invalid!@#')).toBe(false);
    });

    it('should validate objectId', () => {
        expect(ValidationPatterns.objectId.test('507f1f77bcf86cd799439011')).toBe(true);
        expect(ValidationPatterns.objectId.test('invalid')).toBe(false);
    });

    it('should validate uuid', () => {
        // ValidationPatterns.uuid checks for v4
        expect(ValidationPatterns.uuid.test('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
        expect(ValidationPatterns.uuid.test('invalid')).toBe(false);
    });
  });
});
