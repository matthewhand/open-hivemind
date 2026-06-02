import {
  convertToYAML,
  detectFormat,
  parseYAML,
} from '../../../../src/server/services/configImportExport/formatConverters';

describe('formatConverters - YAML', () => {
  describe('parseYAML', () => {
    it('parses a simple scalar mapping', () => {
      const result = parseYAML('name: hivemind\nenabled: true\ncount: 3\n');
      expect(result).toEqual({ name: 'hivemind', enabled: true, count: 3 });
    });

    it('parses nested objects and arrays', () => {
      const yaml = [
        'version: 1',
        'configurations:',
        '  - name: bot-a',
        '    provider: openai',
        '  - name: bot-b',
        '    provider: anthropic',
        '',
      ].join('\n');
      const result = parseYAML(yaml);
      expect(result).toEqual({
        version: 1,
        configurations: [
          { name: 'bot-a', provider: 'openai' },
          { name: 'bot-b', provider: 'anthropic' },
        ],
      });
    });

    it('preserves strings that contain special characters', () => {
      const result = parseYAML('token: "abc:123, with comma"\n');
      expect(result.token).toBe('abc:123, with comma');
    });

    it('throws on malformed YAML', () => {
      // Unbalanced flow collection is invalid YAML.
      expect(() => parseYAML('foo: [1, 2')).toThrow();
    });
  });

  describe('convertToYAML', () => {
    it('serializes an object to a YAML document', () => {
      const yaml = convertToYAML({ name: 'hivemind', enabled: true });
      expect(yaml).toContain('name: hivemind');
      expect(yaml).toContain('enabled: true');
    });

    it('quotes strings that would otherwise be ambiguous', () => {
      const yaml = convertToYAML({ value: 'true', port: '8080' });
      // String "true" must be quoted so it does not round-trip to a boolean.
      const parsed = parseYAML(yaml);
      expect(parsed.value).toBe('true');
      expect(parsed.port).toBe('8080');
    });
  });

  describe('round-trip', () => {
    it('round-trips a representative export payload', () => {
      const exportData = {
        version: '1.0.0',
        exportedAt: '2026-06-02T00:00:00.000Z',
        configurations: [
          {
            name: 'support-bot',
            provider: 'openai',
            enabled: true,
            maxTokens: 2048,
            systemPrompt: 'Be helpful, concise: answer well.',
            channels: ['general', 'help'],
            metadata: { owner: 'team-a', nested: { deep: 'value' } },
          },
        ],
        settings: {
          retries: 0,
          flags: [true, false, true],
        },
      };

      const yaml = convertToYAML(exportData);
      const parsed = parseYAML(yaml);
      expect(parsed).toEqual(exportData);
    });

    it('round-trips an empty object and empty array', () => {
      expect(parseYAML(convertToYAML({}))).toEqual({});
      expect(parseYAML(convertToYAML({ items: [] }))).toEqual({ items: [] });
    });
  });

  describe('detectFormat', () => {
    it('detects yaml and yml extensions', () => {
      expect(detectFormat('config.yaml')).toBe('yaml');
      expect(detectFormat('config.yml')).toBe('yaml');
    });
  });
});
