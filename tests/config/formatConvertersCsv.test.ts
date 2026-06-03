import {
  convertToCSV,
  parseCSV,
} from '@src/server/services/configImportExport/formatConverters';

describe('formatConverters CSV (robust quoting/escaping + nested round-trip)', () => {
  describe('convertToCSV', () => {
    it('throws on non-configuration data', () => {
      expect(() => convertToCSV({})).toThrow('Cannot convert non-configuration data to CSV');
      expect(() => convertToCSV({ configurations: 'nope' })).toThrow(
        'Cannot convert non-configuration data to CSV'
      );
    });

    it('returns empty string for an empty configurations array', () => {
      expect(convertToCSV({ configurations: [] })).toBe('');
    });

    it('quotes fields containing commas, quotes and newlines', () => {
      const csv = convertToCSV({
        configurations: [
          {
            name: 'with,comma',
            systemInstruction: 'has "quotes" inside',
            persona: 'line1\nline2',
          },
        ],
      });
      const lines = csv.trimEnd().split('\n');
      expect(lines[0]).toBe('name,systemInstruction,persona');
      // commas/quotes/newlines force quoting; embedded quotes are doubled.
      expect(csv).toContain('"with,comma"');
      expect(csv).toContain('"has ""quotes"" inside"');
      expect(csv).toContain('"line1\nline2"');
    });

    it('JSON-encodes nested objects/arrays instead of [object Object]', () => {
      const csv = convertToCSV({
        configurations: [
          {
            name: 'bot',
            discord: { token: 'abc', channels: ['a', 'b'] },
            mcpServers: [{ name: 'srv', serverUrl: 'http://x' }],
          },
        ],
      });
      expect(csv).not.toContain('[object Object]');
      // The JSON payload contains commas/quotes so the whole cell is quoted.
      expect(csv).toContain('"{""token"":""abc""');
    });

    it('uses the union of keys across heterogeneous rows', () => {
      const csv = convertToCSV({
        configurations: [
          { name: 'a', llmProvider: 'openai' },
          { name: 'b', messageProvider: 'discord' },
        ],
      });
      const header = csv.split('\n')[0];
      expect(header.split(',').sort()).toEqual(
        ['llmProvider', 'messageProvider', 'name'].sort()
      );
    });

    it('renders null/undefined as empty cells', () => {
      const csv = convertToCSV({
        configurations: [{ name: 'a', persona: null, systemInstruction: undefined }],
      });
      const dataRow = csv.trimEnd().split('\n')[1];
      expect(dataRow).toBe('a,,');
    });
  });

  describe('parseCSV', () => {
    it('throws on empty input', () => {
      expect(() => parseCSV('')).toThrow('Invalid CSV format');
    });

    it('parses a header-only CSV into an empty configurations array', () => {
      expect(parseCSV('name,llmProvider\n')).toEqual({ configurations: [] });
    });

    it('parses quoted fields with embedded commas/quotes/newlines', () => {
      const csv =
        'name,systemInstruction,persona\n' +
        '"with,comma","has ""quotes"" inside","line1\nline2"\n';
      const result = parseCSV(csv);
      expect(result.configurations).toEqual([
        {
          name: 'with,comma',
          systemInstruction: 'has "quotes" inside',
          persona: 'line1\nline2',
        },
      ]);
    });

    it('decodes JSON object/array cells back into structured values', () => {
      const csv =
        'name,discord\n' + 'bot,"{""token"":""abc"",""channels"":[""a"",""b""]}"\n';
      const result = parseCSV(csv);
      expect(result.configurations[0].discord).toEqual({
        token: 'abc',
        channels: ['a', 'b'],
      });
    });

    it('leaves malformed JSON-looking cells as raw strings', () => {
      const csv = 'name,blob\n' + 'bot,"{not valid json"\n';
      const result = parseCSV(csv);
      expect(result.configurations[0].blob).toBe('{not valid json');
    });

    it('handles CRLF line endings', () => {
      const csv = 'name,llmProvider\r\nbot,openai\r\n';
      const result = parseCSV(csv);
      expect(result.configurations).toEqual([{ name: 'bot', llmProvider: 'openai' }]);
    });
  });

  describe('round-trip', () => {
    it('survives a convert -> parse round trip for realistic config data', () => {
      const data = {
        configurations: [
          {
            id: 1,
            name: 'Support, Bot',
            messageProvider: 'discord',
            llmProvider: 'openai',
            systemInstruction: 'Be helpful.\nUse "quotes" carefully.',
            discord: { token: 'tok,en', channels: ['general', 'help'] },
            mcpServers: [{ name: 'srv', serverUrl: 'http://x:1/api' }],
            persona: '',
            isActive: true,
          },
          {
            id: 2,
            name: 'Plain',
            messageProvider: 'slack',
            llmProvider: 'flowise',
            systemInstruction: 'Short.',
            discord: { token: 'b', channels: [] },
            mcpServers: [],
            persona: 'cheerful',
            isActive: false,
          },
        ],
      };

      const csv = convertToCSV(data);
      const parsed = parseCSV(csv);

      // Objects/arrays round-trip structurally; scalars round-trip as strings
      // because CSV is untyped (numbers/booleans come back as strings).
      const expected = data.configurations.map((cfg) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(cfg)) {
          out[k] = typeof v === 'object' && v !== null ? v : String(v);
        }
        return out;
      });

      expect(parsed.configurations).toEqual(expected);
    });
  });
});
