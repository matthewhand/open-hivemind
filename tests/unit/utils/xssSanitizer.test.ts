import { sanitizeText, sanitizeHTML, sanitizeURL, ContextSanitizers } from '../../../src/utils/xssSanitizer';

describe('Server XSS Sanitizer', () => {
  describe('sanitizeText', () => {
    it('encodes HTML entities correctly', () => {
      expect(sanitizeText('<script>alert("XSS & test\'s")</script>')).toBe('&lt;script&gt;alert(&quot;XSS &amp; test&#x27;s&quot;)&lt;&#x2F;script&gt;');
    });

    it('returns empty string for null or undefined', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });

    it('handles normal text properly', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeHTML', () => {
    it('strips dangerous tags like <script>', () => {
      expect(sanitizeHTML('<script>alert("1")</script><div>Test</div>')).toBe('<div>Test</div>');
    });

    it('removes javascript: protocols from hrefs', () => {
      expect(sanitizeHTML('<a href="javascript:alert(1)">Click</a>')).toBe('<a>Click</a>');
    });
  });

  describe('sanitizeURL', () => {
    it('blocks dangerous URL protocols', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
      expect(sanitizeURL('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTs8L3NjcmlwdD4=')).toBe('');
      expect(sanitizeURL('vbscript:msgbox("Hello")')).toBe('');
    });

    it('allows safe protocols', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
      expect(sanitizeURL('/relative/path')).toBe('/relative/path');
    });
  });

  describe('ContextSanitizers', () => {
    it('attribute sanitizer escapes correctly', () => {
      expect(ContextSanitizers.attribute('"onclick="alert(1)"')).toBe('&quot;onclick=&quot;alert(1)&quot;');
    });
  });
});
