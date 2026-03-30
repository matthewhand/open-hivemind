/**
 * Tests for xssSanitizer
 *
 * DOMPurify + JSDOM have ESM dependencies that are hard to transform in Jest,
 * so we mock them and test the pure functions directly.
 */

jest.mock('jsdom', () => ({
  JSDOM: jest.fn().mockImplementation(() => ({ window: {} })),
}));

jest.mock('dompurify', () => {
  const sanitizeFn = jest.fn((dirty: string, config?: any) => {
    if (config && config.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
      return dirty.replace(/<[^>]*>/g, '');
    }
    return dirty
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\s*onerror="[^"]*"/g, '')
      .replace(/\s*onclick="[^"]*"/g, '');
  });
  return jest.fn(() => ({ sanitize: sanitizeFn }));
});

import {
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  sanitizeHTML,
  stripHTML,
  ContextSanitizers,
  safeHTMLTemplate,
} from '@src/utils/xssSanitizer';

describe('xssSanitizer', () => {
  describe('sanitizeText', () => {
    it('escapes single quotes to &#x27;', () => {
      expect(sanitizeText("it's")).toBe("it&#x27;s");
    });

    it('escapes forward slashes to &#x2F;', () => {
      expect(sanitizeText('a/b')).toBe('a&#x2F;b');
    });

    it('returns empty string for null/undefined/empty', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
      expect(sanitizeText('')).toBe('');
    });

    it('preserves normal text without special characters', () => {
      expect(sanitizeText('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeURL', () => {
    it('allows http URLs', () => {
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
    });

    it('allows https URLs', () => {
      expect(sanitizeURL('https://example.com/path')).toBe('https://example.com/path');
    });

    it('allows relative URLs', () => {
      expect(sanitizeURL('/api/data')).toBe('/api/data');
      expect(sanitizeURL('./page')).toBe('./page');
      expect(sanitizeURL('../page')).toBe('../page');
    });

    it('allows mailto URLs', () => {
      expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('allows fragment-only URLs', () => {
      expect(sanitizeURL('#section')).toBe('#section');
    });

    it('allows URLs without a protocol that have no colon', () => {
      expect(sanitizeURL('example.com')).toBe('example.com');
    });

    it('blocks javascript: protocol', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
    });

    it('blocks data: protocol', () => {
      expect(sanitizeURL('data:text/html,test')).toBe('');
    });

    it('blocks vbscript: protocol', () => {
      expect(sanitizeURL('vbscript:msgbox("xss")')).toBe('');
    });

    it('blocks file: protocol', () => {
      expect(sanitizeURL('file:///etc/passwd')).toBe('');
    });

    it('blocks blob: protocol', () => {
      expect(sanitizeURL('blob:http://example.com/data')).toBe('');
    });

    it('blocks about: protocol', () => {
      expect(sanitizeURL('about:blank')).toBe('');
    });

    it('blocks unknown protocols with colon', () => {
      expect(sanitizeURL('ftp://example.com')).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeURL(null as any)).toBe('');
      expect(sanitizeURL('')).toBe('');
    });

    it('trims whitespace', () => {
      expect(sanitizeURL('  https://example.com  ')).toBe('https://example.com');
    });

    it('checks protocol case-insensitively', () => {
      expect(sanitizeURL('JAVASCRIPT:alert(1)')).toBe('');
      expect(sanitizeURL('JavaScript:void(0)')).toBe('');
    });
  });

  describe('sanitizeHTML (mocked DOMPurify)', () => {
    it('removes script tags via DOMPurify', () => {
      const result = sanitizeHTML('<p>Hello</p><script>alert(1)</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Hello</p>');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeHTML(null as any)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });
  });

  describe('stripHTML (mocked DOMPurify)', () => {
    it('removes all HTML tags', () => {
      expect(stripHTML('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('returns empty string for non-string input', () => {
      expect(stripHTML(null as any)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('applies sanitizeText to string values', () => {
      const result = sanitizeObject({ name: "it's" });
      // sanitizeText escapes ' to &#x27;
      expect(Object.values(result)[0]).toBe("it&#x27;s");
    });

    it('recursively sanitizes nested objects', () => {
      const result = sanitizeObject({ nested: { val: "a/b" } });
      const nested = Object.values(result)[0] as any;
      expect(Object.values(nested)[0]).toBe('a&#x2F;b');
    });

    it('preserves non-string values', () => {
      const result = sanitizeObject({ count: 42, active: true });
      expect(Object.values(result)).toContain(42);
      expect(Object.values(result)).toContain(true);
    });

    it('returns non-object input as-is', () => {
      expect(sanitizeObject(null as any)).toBeNull();
    });

    it('handles arrays', () => {
      const result = sanitizeObject(['a/b', 'c/d'] as any);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('ContextSanitizers', () => {
    it('css removes non-alphanumeric characters except hyphens/underscores', () => {
      expect(ContextSanitizers.css('color: red;')).toBe('colorred');
      expect(ContextSanitizers.css('my-class_name')).toBe('my-class_name');
    });

    it('urlParam encodes special characters', () => {
      expect(ContextSanitizers.urlParam('hello world&foo=bar')).toBe(
        'hello%20world%26foo%3Dbar'
      );
    });

    it('json escapes for JSON string context', () => {
      const result = ContextSanitizers.json('line1\nline2');
      expect(result).toContain('\\n');
    });

    it('javascript escapes angle brackets', () => {
      const result = ContextSanitizers.javascript('<tag>');
      expect(result).toContain('\\x3C');
      expect(result).toContain('\\x3E');
    });

    it('javascript escapes quotes and backslashes', () => {
      const result = ContextSanitizers.javascript('a\\b"c\'d');
      expect(result).toContain('\\\\');
      expect(result).toContain('\\"');
      expect(result).toContain("\\'");
    });

    it('javascript escapes newlines', () => {
      expect(ContextSanitizers.javascript('a\nb\rc')).toContain('\\n');
      expect(ContextSanitizers.javascript('a\nb\rc')).toContain('\\r');
    });
  });

  describe('safeHTMLTemplate', () => {
    it('applies sanitizeText to interpolated string values', () => {
      const val = "it's";
      const result = safeHTMLTemplate`<p>${val}</p>`;
      expect(result).toContain("it&#x27;s");
    });

    it('handles non-string values by JSON-stringifying', () => {
      const result = safeHTMLTemplate`count: ${42}`;
      expect(result).toBe('count: 42');
    });

    it('handles object interpolation', () => {
      const result = safeHTMLTemplate`data: ${{ key: 'val' }}`;
      expect(result).toContain('"key"');
    });
  });
});
