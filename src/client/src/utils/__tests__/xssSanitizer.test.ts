import { describe, expect, test } from 'vitest';
import {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  stripHTML,
  ContextSanitizers,
  useSanitizedInput,
  safeHTMLTemplate
} from '../xssSanitizer';

describe('xssSanitizer', () => {
  describe('sanitizeHTML', () => {
    test('removes script tags', () => {
      const dirty = '<script>alert("xss")</script>Hello';
      expect(sanitizeHTML(dirty)).toBe('Hello');
    });

    test('removes event handlers', () => {
      const dirty = '<div onclick="alert(\'xss\')">Hello</div>';
      // DOMPurify removes the attribute
      expect(sanitizeHTML(dirty)).toBe('<div>Hello</div>');
    });

    test('allows safe tags and attributes', () => {
      const clean = '<div class="test"><b>Bold</b></div>';
      expect(sanitizeHTML(clean)).toBe(clean);
    });

    test('removes javascript: in attributes', () => {
        const dirty = '<a href="javascript:alert(\'xss\')">Click me</a>';
        // DOMPurify with the hook should remove the href
        expect(sanitizeHTML(dirty)).toContain('Click me');
        expect(sanitizeHTML(dirty)).not.toContain('javascript:');
    });

    test('handles non-string input', () => {
        expect(sanitizeHTML(null as any)).toBe('');
        expect(sanitizeHTML(123 as any)).toBe('');
    });

    test('merges custom config', () => {
        const dirty = '<custom-tag>content</custom-tag>';
        // Verify default removes it (DOMPurify defaults + config in file)
        expect(sanitizeHTML(dirty)).not.toContain('<custom-tag>');

        // Verify we can allow it
        expect(sanitizeHTML(dirty, { ALLOWED_TAGS: ['custom-tag'] })).toBe(dirty);
    });
  });

  describe('sanitizeText', () => {
    test('escapes HTML entities', () => {
      const dirty = '<script>alert("xss")</script>';
      const result = sanitizeText(dirty);
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
    });

    test('handles non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    test('allows http/https URLs', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com');
      expect(sanitizeURL('http://example.com')).toBe('http://example.com');
    });

    test('blocks javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
    });

    test('blocks data: URLs', () => {
      expect(sanitizeURL('data:text/html,base64...')).toBe('');
    });

    test('allows relative URLs', () => {
      expect(sanitizeURL('/path/to/resource')).toBe('/path/to/resource');
      expect(sanitizeURL('./path')).toBe('./path');
      expect(sanitizeURL('../path')).toBe('../path');
    });

    test('handles whitespace', () => {
        expect(sanitizeURL('  https://example.com  ')).toBe('https://example.com');
    });

    test('handles non-string input', () => {
      expect(sanitizeURL(null as any)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    test('recursively sanitizes objects', () => {
      const dirty = {
        name: '<script>alert(1)</script>',
        nested: {
          description: '<b>Bold</b>'
        },
        list: ['<img src=x onerror=alert(1)>']
      };

      const clean = sanitizeObject(dirty);
      expect(clean.name).toContain('&lt;script&gt;');
      expect(clean.nested.description).toContain('&lt;b&gt;');
      expect(clean.list[0]).toContain('&lt;img');
    });

    test('handles non-object input', () => {
        expect(sanitizeObject('string' as any)).toBe('string');
        expect(sanitizeObject(null as any)).toBe(null);
    });
  });

  describe('stripHTML', () => {
    test('removes all tags', () => {
      const dirty = '<p>Hello <b>World</b></p>';
      expect(stripHTML(dirty)).toBe('Hello World');
    });

    test('handles non-string input', () => {
      expect(stripHTML(null as any)).toBe('');
    });
  });

  describe('ContextSanitizers', () => {
    test('javascript escapes special chars', () => {
      const input = '"; alert(1); //';
      const output = ContextSanitizers.javascript(input);
      // It escapes special chars to make it a safe string literal content.
      expect(output).toBe('\\"; alert(1); //');
    });

    test('css allows only safe chars', () => {
        expect(ContextSanitizers.css('color: red;')).toBe('colorred');
        expect(ContextSanitizers.css('class-name_123')).toBe('class-name_123');
    });

    test('urlParam encodes input', () => {
        expect(ContextSanitizers.urlParam('hello world?')).toBe('hello%20world%3F');
    });

    test('json stringifies input', () => {
        expect(ContextSanitizers.json('test"quote')).toBe('test\\"quote');
    });

    test('attribute escapes quotes', () => {
        const input = 'test " value';
        const output = ContextSanitizers.attribute(input);
        // It should be safe for attribute usage
        expect(output).not.toContain('"');
    });
  });

  describe('useSanitizedInput', () => {
      test('sanitizes as html', () => {
          expect(useSanitizedInput('<script>', 'html')).toBe('');
      });
      test('sanitizes as url', () => {
          expect(useSanitizedInput('javascript:', 'url')).toBe('');
      });
      test('sanitizes as text default', () => {
          expect(useSanitizedInput('<b>bold</b>')).toContain('&lt;b&gt;');
      });
  });

  describe('safeHTMLTemplate', () => {
      test('interpolates and sanitizes', () => {
          const dangerous = '<script>';
          const result = safeHTMLTemplate`Value: ${dangerous}`;
          expect(result).toContain('Value: ');
          expect(result).toContain('&lt;script&gt;');
      });
  });
});
