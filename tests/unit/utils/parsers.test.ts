import { commandParser, jsonParser, messageParser, numberParser } from '@src/utils/parsers';

describe('parsers', () => {
  describe('commandParser', () => {
    it('parses a !command with arguments', () => {
      const result = commandParser.parse('!help topic1 topic2');
      expect(result.command).toBe('help');
      expect(result.args).toEqual(['topic1', 'topic2']);
    });

    it('parses a /command with arguments', () => {
      const result = commandParser.parse('/deploy staging');
      expect(result.command).toBe('deploy');
      expect(result.args).toEqual(['staging']);
    });

    it('returns empty args for non-command input', () => {
      const result = commandParser.parse('hello world');
      expect(result.command).toBeUndefined();
      expect(result.args).toEqual([]);
    });

    it('returns empty args for empty string', () => {
      expect(commandParser.parse('').args).toEqual([]);
    });

    it('returns empty args for null/undefined input', () => {
      expect(commandParser.parse(null as any).args).toEqual([]);
      expect(commandParser.parse(undefined as any).args).toEqual([]);
    });

    it('returns empty args for whitespace-only input', () => {
      expect(commandParser.parse('   ').args).toEqual([]);
    });

    it('handles command with no arguments', () => {
      const result = commandParser.parse('!status');
      expect(result.command).toBe('status');
      expect(result.args).toEqual([]);
    });

    it('trims extra whitespace between arguments', () => {
      const result = commandParser.parse('!cmd   arg1   arg2');
      expect(result.args).toEqual(['arg1', 'arg2']);
    });
  });

  describe('messageParser', () => {
    describe('extractMentions', () => {
      it('extracts user mentions', () => {
        const mentions = messageParser.extractMentions('Hello <@U123> and <@U456>');
        expect(mentions).toEqual(['U123', 'U456']);
      });

      it('returns empty array when no mentions', () => {
        expect(messageParser.extractMentions('no mentions here')).toEqual([]);
      });
    });

    describe('extractChannelMentions', () => {
      it('extracts channel mentions', () => {
        const channels = messageParser.extractChannelMentions('See <#C123> and <#C456>');
        expect(channels).toEqual(['C123', 'C456']);
      });

      it('returns empty array when no channel mentions', () => {
        expect(messageParser.extractChannelMentions('no channels')).toEqual([]);
      });
    });

    describe('stripFormatting', () => {
      it('removes code blocks', () => {
        expect(messageParser.stripFormatting('before ```code``` after')).toBe('before  after');
      });

      it('removes bold and italic markers', () => {
        expect(messageParser.stripFormatting('*bold* and _italic_')).toBe('bold and italic');
      });

      it('removes inline code', () => {
        expect(messageParser.stripFormatting('use `command` now')).toBe('use command now');
      });

      it('removes Slack-style mentions', () => {
        expect(messageParser.stripFormatting('Hi <@U123>')).toBe('Hi');
      });
    });
  });

  describe('jsonParser', () => {
    describe('safeParse', () => {
      it('parses valid JSON', () => {
        expect(jsonParser.safeParse('{"a":1}', {})).toEqual({ a: 1 });
      });

      it('returns fallback for invalid JSON', () => {
        expect(jsonParser.safeParse('not json', { default: true })).toEqual({ default: true });
      });
    });

    describe('safeStringify', () => {
      it('stringifies an object', () => {
        expect(jsonParser.safeStringify({ a: 1 })).toBe('{"a":1}');
      });

      it('returns fallback for circular reference', () => {
        const obj: any = {};
        obj.self = obj;
        expect(jsonParser.safeStringify(obj, 'fallback')).toBe('fallback');
      });
    });
  });

  describe('numberParser', () => {
    describe('parseNumber', () => {
      it('parses a string number', () => {
        expect(numberParser.parseNumber('3.14')).toBe(3.14);
      });

      it('returns fallback for non-numeric string', () => {
        expect(numberParser.parseNumber('abc', 42)).toBe(42);
      });

      it('passes through a valid number', () => {
        expect(numberParser.parseNumber(7)).toBe(7);
      });

      it('returns fallback for NaN number input', () => {
        expect(numberParser.parseNumber(NaN, 0)).toBe(0);
      });
    });

    describe('parseInt', () => {
      it('parses a string integer', () => {
        expect(numberParser.parseInt('42')).toBe(42);
      });

      it('floors a numeric input', () => {
        expect(numberParser.parseInt(3.9)).toBe(3);
      });

      it('returns fallback for non-numeric string', () => {
        expect(numberParser.parseInt('xyz', -1)).toBe(-1);
      });

      it('returns fallback for NaN', () => {
        expect(numberParser.parseInt(NaN, 0)).toBe(0);
      });
    });
  });
});
