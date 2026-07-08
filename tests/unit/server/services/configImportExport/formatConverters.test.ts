/**
 * Tests for YAML/CSV format conversion in the configuration import/export pipeline.
 *
 * Regression: parseYAML previously threw 'YAML parsing not implemented' and
 * convertToYAML was a lossy hand-rolled serializer, so YAML exports could not be
 * re-imported. These tests assert that convertToYAML + parseYAML round-trip the
 * config export shapes (nested maps, arrays of objects, mixed scalar types).
 */
import {
  convertToCSV,
  convertToYAML,
  detectFormat,
  parseCSV,
  parseYAML,
} from '../../../../../src/server/services/configImportExport/formatConverters';

describe('detectFormat', () => {
  it('detects formats from file extension', () => {
    expect(detectFormat('config.json')).toBe('json');
    expect(detectFormat('config.yaml')).toBe('yaml');
    expect(detectFormat('config.yml')).toBe('yaml');
    expect(detectFormat('config.csv')).toBe('csv');
    expect(detectFormat('config.unknown')).toBe('json');
  });
});

describe('convertToYAML / parseYAML round-trip', () => {
  const roundTrip = (value: unknown): unknown => parseYAML(convertToYAML(value));

  it('round-trips a flat mapping of scalars', () => {
    const data = { name: 'bot-1', enabled: true, count: 3, disabled: false, note: null };
    expect(roundTrip(data)).toEqual(data);
  });

  it('round-trips nested mappings', () => {
    const data = {
      metadata: { id: 'exp-1', configCount: 2, encrypted: false },
      settings: { llm: { provider: 'openai', temperature: 0.7 } },
    };
    expect(roundTrip(data)).toEqual(data);
  });

  it('round-trips arrays of objects (configurations export shape)', () => {
    const data = {
      metadata: { name: 'export', configCount: 2 },
      configurations: [
        { id: 1, name: 'Alpha', enabled: true },
        { id: 2, name: 'Beta', enabled: false },
      ],
    };
    expect(roundTrip(data)).toEqual(data);
  });

  it('round-trips arrays of scalars and empty collections', () => {
    const data = {
      tags: ['a', 'b', 'c'],
      empties: [],
      emptyObj: {},
    };
    expect(roundTrip(data)).toEqual(data);
  });

  it('round-trips nested arrays inside array items', () => {
    const data = {
      groups: [
        { name: 'g1', members: ['x', 'y'] },
        { name: 'g2', members: [] },
      ],
    };
    expect(roundTrip(data)).toEqual(data);
  });

  it('quotes and recovers strings that look like other types', () => {
    const data = {
      stringTrue: 'true',
      stringNull: 'null',
      stringNumber: '42',
      withColon: 'key: value',
      withHash: 'a # b',
      empty: '',
      leadingSpace: '  padded  ',
    };
    expect(roundTrip(data)).toEqual(data);
  });

  it('preserves special characters via quoting', () => {
    const data = { text: 'line with "quotes", commas, and: colons' };
    expect(roundTrip(data)).toEqual(data);
  });

  it('serializes Date values as ISO strings', () => {
    const date = new Date('2026-06-03T12:00:00.000Z');
    const yaml = convertToYAML({ createdAt: date });
    const parsed = parseYAML(yaml) as { createdAt: string };
    expect(parsed.createdAt).toBe('2026-06-03T12:00:00.000Z');
  });

  it('produces parseable output for a realistic export payload', () => {
    const exportData = {
      metadata: {
        id: 'export-123',
        name: 'my-backup',
        configCount: 1,
        format: 'yaml',
        encrypted: false,
        compressed: false,
      },
      configurations: [
        {
          id: 7,
          name: 'Support Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          isActive: true,
          description: 'Handles: customer support, escalations',
        },
      ],
    };
    expect(roundTrip(exportData)).toEqual(exportData);
  });
});

describe('parseYAML edge cases', () => {
  it('returns null for empty input', () => {
    expect(parseYAML('')).toBeNull();
    expect(parseYAML('\n\n')).toBeNull();
  });

  it('ignores document markers and comment lines', () => {
    const yaml = '---\n# a comment\nname: bot\nenabled: true\n';
    expect(parseYAML(yaml)).toEqual({ name: 'bot', enabled: true });
  });

  it('parses single-quoted strings', () => {
    expect(parseYAML("name: 'it''s here'\n")).toEqual({ name: "it's here" });
  });
});

describe('convertToCSV / parseCSV', () => {
  it('round-trips configuration rows without embedded delimiters', () => {
    const data = {
      configurations: [
        { id: '1', name: 'Alpha', note: 'plain' },
        { id: '2', name: 'Beta', note: 'simple' },
      ],
    };
    const csv = convertToCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed).toEqual(data);
  });

  it('throws when converting non-configuration data', () => {
    expect(() => convertToCSV({ foo: 'bar' })).toThrow(/non-configuration/);
  });
});
