import {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeObject,
  stripHTML,
  ContextSanitizers,
  safeHTMLTemplate
} from '../../src/utils/xssSanitizer';

describe('xssSanitizer', () => {
  describe('sanitizeHTML', () => {
    test('removes script tags', () => {
      const dirty = '<script>alert("xss")</script>Hello';
      expect(sanitizeHTML(dirty)).toBe('Hello');
    });

    test('removes event handlers', () => {
      const dirty = '<div onclick="alert(\'xss\')">Hello</div>';
      expect(sanitizeHTML(dirty)).toBe('<div>Hello</div>');
    });

    test('allows safe tags and attributes', () => {
      const clean = '<div class="test"><b>Bold</b></div>';
      expect(sanitizeHTML(clean)).toBe(clean);
    });

    test('handles non-string input', () => {
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(123 as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    test('escapes HTML entities correctly', () => {
      const dirty = '<script>alert("xss") & </script>';
      const result = sanitizeText(dirty);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;) &amp; &lt;&#x2F;script&gt;');
    });

    test('escapes single quotes', () => {
        expect(sanitizeText("'")).toBe('&#x27;');
    });

    test('escapes slashes', () => {
        expect(sanitizeText("/")).toBe('&#x2F;');
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

    test('blocks dangerous protocols', () => {
      expect(sanitizeURL('javascript:alert(1)')).toBe('');
      expect(sanitizeURL('data:text/html,base64...')).toBe('');
      expect(sanitizeURL('vbscript:msgbox("hi")')).toBe('');
      expect(sanitizeURL('file:///etc/passwd')).toBe('');
    });

    test('allows relative URLs', () => {
      expect(sanitizeURL('/path/to/resource')).toBe('/path/to/resource');
      expect(sanitizeURL('./path')).toBe('./path');
      expect(sanitizeURL('../path')).toBe('../path');
      expect(sanitizeURL('#anchor')).toBe('#anchor');
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
      expect(clean.name).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
      expect(clean.nested.description).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt;');
      expect(clean.list[0]).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    test('sanitizes object keys', () => {
      const dirty = {
        '<script>': 'value'
      };
      const clean = sanitizeObject(dirty);
      expect(clean).toHaveProperty('&lt;script&gt;');
      expect(clean['&lt;script&gt;']).toBe('value');
    });

    test('handles non-string values', () => {
        const dirty = {
            num: 123,
            bool: true,
            n: null,
            undef: undefined
        };
        const clean = sanitizeObject(dirty);
        expect(clean.num).toBe(123);
        expect(clean.bool).toBe(true);
        expect(clean.n).toBe(null);
        expect(clean.undef).toBe(undefined);
    });

    test('handles arrays at top level', () => {
        const dirty = ['<script>', { key: '<b>' }];
        const clean = sanitizeObject(dirty as any);
        expect(clean[0]).toBe('&lt;script&gt;');
        expect(clean[1].key).toBe('&lt;b&gt;');
    });

    test('handles deeply nested structures', () => {
        const dirty = {
            a: {
                b: {
                    c: ['<', '>']
                }
            }
        };
        const clean = sanitizeObject(dirty);
        expect(clean.a.b.c).toEqual(['&lt;', '&gt;']);
    });

    test('handles empty objects and arrays', () => {
        expect(sanitizeObject({})).toEqual({});
        expect(sanitizeObject([])).toEqual([]);
    });

    test('handles non-object input', () => {
      expect(sanitizeObject('string' as any)).toBe('string');
      expect(sanitizeObject(null as any)).toBe(null);
      expect(sanitizeObject(123 as any)).toBe(123);
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
    test('attribute context', () => {
        expect(ContextSanitizers.attribute('val"quote')).toBe('val&quot;quote');
    });

    test('javascript context', () => {
      const input = '"; alert(1); //';
      const output = ContextSanitizers.javascript(input);
      expect(output).toBe('\\"; alert(1); //');
    });

    test('css context', () => {
        expect(ContextSanitizers.css('color: red;')).toBe('colorred');
    });

    test('urlParam context', () => {
        expect(ContextSanitizers.urlParam('a b')).toBe('a%20b');
    });

    test('json context', () => {
        expect(ContextSanitizers.json('test"quote')).toBe('test\\"quote');
    });
  });

  describe('safeHTMLTemplate', () => {
    test('interpolates and sanitizes strings', () => {
      const dangerous = '<script>';
      const result = safeHTMLTemplate`Value: ${dangerous}`;
      expect(result).toBe('Value: &lt;script&gt;');
    });

    test('interpolates and stringifies non-strings', () => {
        const val = { key: 'val' };
        const result = safeHTMLTemplate`Value: ${val}`;
        expect(result).toBe('Value: {"key":"val"}');
    });
  });
});
