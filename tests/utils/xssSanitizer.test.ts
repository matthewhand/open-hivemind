import {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  stripHTML,
  ContextSanitizers,
  generateCSPNonce,
  safeHTMLTemplate,
} from '../../src/utils/xssSanitizer';

describe('xssSanitizer', () => {
  describe('sanitizeHTML', () => {
    it('should allow safe HTML', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      expect(sanitizeHTML(input)).toBe(input);
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const expected = '<p>Hello</p>';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should remove dangerous attributes', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const expected = '<img src="x">';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should remove forbidden tags', () => {
      const input = '<iframe></iframe><form><input></form>';
      expect(sanitizeHTML(input)).toBe('');
    });

    it('should handle custom configuration', () => {
      const input = '<custom-tag>Hello</custom-tag>';
      const config = { ADD_TAGS: ['custom-tag'] };
      expect(sanitizeHTML(input, config)).toBe('<custom-tag>Hello</custom-tag>');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
      expect(sanitizeHTML(123 as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should escape HTML special characters', () => {
      const input = "<b> \"hello\" & ' /";
      const expected = '&lt;b&gt; &quot;hello&quot; &amp; &#x27; &#x2F;';
      expect(sanitizeText(input)).toBe(expected);
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('should allow safe protocols', () => {
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeURL('/path/to/page')).toBe('/path/to/page');
      expect(sanitizeURL('./path')).toBe('./path');
      expect(sanitizeURL('../path')).toBe('../path');
      expect(sanitizeURL('#anchor')).toBe('#anchor');
    });

    it('should block dangerous protocols', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
      expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(sanitizeURL('vbscript:msgbox("hi")')).toBe('');
    });

    it('should return empty string for invalid input', () => {
      expect(sanitizeURL(null as any)).toBe('');
      expect(sanitizeURL('   ')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in an object', () => {
      const input = {
        name: '<b>John</b>',
        meta: {
          title: '<script>alert(1)</script>',
        },
      };
      const expected = {
        name: '&lt;b&gt;John&lt;&#x2F;b&gt;',
        meta: {
          title: '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
        },
      };
      expect(sanitizeObject(input)).toEqual(expected);
    });

    it('should sanitize arrays', () => {
      const input = ['<br>', { key: '<i>' }];
      const expected = ['&lt;br&gt;', { key: '&lt;i&gt;' }];
      expect(sanitizeObject(input as any)).toEqual(expected);
    });

    it('should sanitize keys as well', () => {
      const input = { '<script>': 'value' };
      const expected = { '&lt;script&gt;': 'value' };
      expect(sanitizeObject(input)).toEqual(expected);
    });
  });

  describe('stripHTML', () => {
    it('should remove all HTML tags', () => {
      const input = '<div>Hello <span>World</span><script>alert(1)</script></div>';
      expect(stripHTML(input)).toBe('Hello World');
    });
  });

  describe('ContextSanitizers', () => {
    it('should sanitize for attribute context', () => {
      expect(ContextSanitizers.attribute('val"ue')).toBe('val&quot;ue');
    });

    it('should sanitize for javascript context', () => {
      const input = "'; alert(1); //";
      const sanitized = ContextSanitizers.javascript(input);
      expect(sanitized).not.toContain("'");
      expect(sanitized).toContain("\\'");
    });

    it('should sanitize for css context', () => {
      expect(ContextSanitizers.css('color: red;')).toBe('colorred');
    });

    it('should sanitize for urlParam context', () => {
      expect(ContextSanitizers.urlParam('a b&c')).toBe('a%20b%26c');
    });

    it('should sanitize for json context', () => {
      expect(ContextSanitizers.json('foo"bar')).toBe('foo\\"bar');
    });
  });

  describe('generateCSPNonce', () => {
    it('should generate a base64 string', () => {
      const nonce = generateCSPNonce();
      expect(typeof nonce).toBe('string');
      expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,}$/);
    });

    it('should generate different nonces', () => {
      const nonce1 = generateCSPNonce();
      const nonce2 = generateCSPNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('safeHTMLTemplate', () => {
    it('should sanitize interpolations', () => {
      const unsafe = '<b>Unsafe</b>';
      const result = safeHTMLTemplate`<div>${unsafe}</div>`;
      expect(result).toBe('<div>&lt;b&gt;Unsafe&lt;&#x2F;b&gt;</div>');
    });

    it('should handle non-string interpolations', () => {
      const value = { foo: 'bar' };
      const result = safeHTMLTemplate`<span>${value}</span>`;
      expect(result).toBe('<span>{"foo":"bar"}</span>');
    });
  });
});
