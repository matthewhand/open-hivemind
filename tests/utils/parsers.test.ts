import { commandParser, messageParser, urlParser, jsonParser, numberParser } from '@src/utils/parsers';

describe('commandParser', () => {
  describe('parse', () => {
    it('should return empty args for non-string input', () => {
      expect(commandParser.parse(null as any)).toEqual({ args: [] });
      expect(commandParser.parse(undefined as any)).toEqual({ args: [] });
      expect(commandParser.parse(123 as any)).toEqual({ args: [] });
    });

    it('should return empty args for empty or whitespace-only input', () => {
      expect(commandParser.parse('')).toEqual({ args: [] });
      expect(commandParser.parse('   ')).toEqual({ args: [] });
    });

    it('should return empty args for input without command prefix', () => {
      expect(commandParser.parse('hello')).toEqual({ args: [] });
      expect(commandParser.parse('hello world')).toEqual({ args: [] });
    });

    it('should parse command starting with "!"', () => {
      expect(commandParser.parse('!test')).toEqual({ command: 'test', args: [] });
    });

    it('should parse command starting with "/"', () => {
      expect(commandParser.parse('/test')).toEqual({ command: 'test', args: [] });
    });

    it('should parse command with arguments', () => {
      expect(commandParser.parse('!test arg1 arg2')).toEqual({ command: 'test', args: ['arg1', 'arg2'] });
    });

    it('should handle multiple spaces between arguments', () => {
      expect(commandParser.parse('!test   arg1   arg2')).toEqual({ command: 'test', args: ['arg1', 'arg2'] });
    });

    it('should handle trailing spaces', () => {
      expect(commandParser.parse('!test arg1   ')).toEqual({ command: 'test', args: ['arg1'] });
    });

    it('should handle mixed whitespace', () => {
      expect(commandParser.parse('!test\targ1\narg2')).toEqual({ command: 'test', args: ['arg1', 'arg2'] });
    });

    // Documenting current behavior for edge cases
    it('should handle space after prefix (current implementation behavior)', () => {
      // Current implementation: trimmed.slice(1).split(/\s+/)
      // "! arg" -> trimmed="! arg" -> slice(1)=" arg" -> split -> ["", "arg"]
      expect(commandParser.parse('! arg')).toEqual({ command: '', args: ['arg'] });
    });

    it('should handle empty command with prefix only (current implementation behavior)', () => {
      // Current implementation: "!" -> trimmed="!" -> slice(1)="" -> split -> [""]
      expect(commandParser.parse('!')).toEqual({ command: '', args: [] });
    });
  });
});

describe('messageParser', () => {
  describe('extractMentions', () => {
    it('should extract single mention', () => {
      expect(messageParser.extractMentions('Hello <@U12345>')).toEqual(['U12345']);
    });

    it('should extract multiple mentions', () => {
      expect(messageParser.extractMentions('Hi <@U1> and <@U2>')).toEqual(['U1', 'U2']);
    });

    it('should return empty array when no mentions found', () => {
      expect(messageParser.extractMentions('Hello world')).toEqual([]);
    });

    it('should handle text with mixed content', () => {
      expect(messageParser.extractMentions('<@U1> test <@U2>')).toEqual(['U1', 'U2']);
    });
  });

  describe('extractChannelMentions', () => {
    it('should extract single channel mention', () => {
      expect(messageParser.extractChannelMentions('Join <#C12345>')).toEqual(['C12345']);
    });

    it('should extract multiple channel mentions', () => {
      expect(messageParser.extractChannelMentions('Check <#C1> and <#C2>')).toEqual(['C1', 'C2']);
    });

    it('should return empty array when no channel mentions found', () => {
      expect(messageParser.extractChannelMentions('Hello world')).toEqual([]);
    });
  });

  describe('stripFormatting', () => {
    it('should remove Slack mentions', () => {
      expect(messageParser.stripFormatting('Hello <@U123>')).toBe('Hello');
    });

    it('should remove bold formatting', () => {
      expect(messageParser.stripFormatting('This is *bold* text')).toBe('This is bold text');
    });

    it('should remove italic formatting', () => {
      expect(messageParser.stripFormatting('This is _italic_ text')).toBe('This is italic text');
    });

    it('should remove inline code', () => {
      expect(messageParser.stripFormatting('This is `code` text')).toBe('This is code text');
    });

    it('should remove code blocks', () => {
      expect(messageParser.stripFormatting('Code:\n```const a = 1;```')).toBe('Code:');
    });

    it('should handle mixed formatting', () => {
      expect(messageParser.stripFormatting('*Bold* and _italic_')).toBe('Bold and italic');
    });

    it('should trim whitespace', () => {
      expect(messageParser.stripFormatting('  *test*  ')).toBe('test');
    });
  });
});


describe('jsonParser', () => {
  describe('safeParse', () => {
    it('should parse valid JSON', () => {
      expect(jsonParser.safeParse('{"a": 1}', {})).toEqual({ a: 1 });
    });

    it('should return fallback for invalid JSON', () => {
      expect(jsonParser.safeParse('invalid', { fallback: true })).toEqual({ fallback: true });
    });

    it('should return fallback for null input', () => {
       // JSON.parse(null) returns null, so safeParse should return null if input is null
       expect(jsonParser.safeParse(null as any, 'fallback')).toBe(null);
    });

    it('should return fallback when parsing throws', () => {
        // unexpected token
        expect(jsonParser.safeParse('{', 'fallback')).toBe('fallback');
    });
  });

  describe('safeStringify', () => {
    it('should stringify valid object', () => {
      expect(jsonParser.safeStringify({ a: 1 })).toBe('{"a":1}');
    });

    it('should return fallback on error (circular reference)', () => {
      const circular: any = {};
      circular.self = circular;
      expect(jsonParser.safeStringify(circular, 'fallback')).toBe('fallback');
    });

    it('should use default fallback if not provided', () => {
        const circular: any = {};
        circular.self = circular;
        expect(jsonParser.safeStringify(circular)).toBe('{}');
    });
  });
});

describe('numberParser', () => {
  describe('parseNumber', () => {
    it('should return number if input is number', () => {
      expect(numberParser.parseNumber(123)).toBe(123);
    });

    it('should parse string number', () => {
      expect(numberParser.parseNumber('123')).toBe(123);
      expect(numberParser.parseNumber('123.45')).toBe(123.45);
    });

    it('should return fallback for invalid string', () => {
      expect(numberParser.parseNumber('abc', 0)).toBe(0);
    });

    it('should return fallback for NaN input', () => {
      expect(numberParser.parseNumber(NaN, 0)).toBe(0);
    });
  });

  describe('parseInt', () => {
    it('should return integer if input is number', () => {
      expect(numberParser.parseInt(123.45)).toBe(123);
    });

    it('should parse string integer', () => {
      expect(numberParser.parseInt('123')).toBe(123);
    });

    it('should parse string float as integer', () => {
        expect(numberParser.parseInt('123.45')).toBe(123);
    });

    it('should return fallback for invalid string', () => {
      expect(numberParser.parseInt('abc', 0)).toBe(0);
    });

    it('should return fallback for NaN input', () => {
        expect(numberParser.parseInt(NaN, 0)).toBe(0);
    });
  });
});
