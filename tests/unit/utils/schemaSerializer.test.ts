import { serializeSchema } from '@src/utils/schemaSerializer';

describe('serializeSchema', () => {
  it('returns null/undefined/primitives as-is', () => {
    expect(serializeSchema(null)).toBeNull();
    expect(serializeSchema(undefined)).toBeUndefined();
    expect(serializeSchema(42)).toBe(42);
    expect(serializeSchema('hello')).toBe('hello');
    expect(serializeSchema(true)).toBe(true);
  });

  it('converts function format to its name', () => {
    const schema = {
      host: { format: String, default: 'localhost' },
    };
    const result = serializeSchema(schema);
    expect(result.host.format).toBe('String');
    expect(result.host.default).toBe('localhost');
  });

  it('uses function name for named arrow functions', () => {
    const schema = {
      port: { format: () => {}, default: 3000 },
    };
    const result = serializeSchema(schema);
    // Arrow functions assigned to object properties get the property name
    expect(typeof result.port.format).toBe('string');
    expect(result.port.format).not.toBe('');
  });

  it('uses "custom" for truly anonymous functions', () => {
    const fn = Object.defineProperty(function () {}, 'name', { value: '' });
    const schema = { port: { format: fn, default: 3000 } };
    const result = serializeSchema(schema);
    expect(result.port.format).toBe('custom');
  });

  it('handles Number constructor', () => {
    const schema = { timeout: { format: Number, default: 5000 } };
    const result = serializeSchema(schema);
    expect(result.timeout.format).toBe('Number');
  });

  it('handles Boolean constructor', () => {
    const schema = { debug: { format: Boolean, default: false } };
    const result = serializeSchema(schema);
    expect(result.debug.format).toBe('Boolean');
  });

  it('serializes arrays recursively', () => {
    const schema = [{ format: String, default: '' }, { format: Number, default: 0 }];
    const result = serializeSchema(schema);
    expect(result[0].format).toBe('String');
    expect(result[1].format).toBe('Number');
  });

  it('recursively processes nested objects without format', () => {
    const schema = {
      database: {
        host: { format: String, default: 'localhost' },
        port: { format: Number, default: 5432 },
      },
    };
    const result = serializeSchema(schema);
    expect(result.database.host.format).toBe('String');
    expect(result.database.port.format).toBe('Number');
  });

  it('handles deeply nested default objects within format nodes', () => {
    const schema = {
      config: {
        format: String,
        default: { nested: { deep: 'value' } },
      },
    };
    const result = serializeSchema(schema);
    expect(result.config.format).toBe('String');
    expect(result.config.default).toEqual({ nested: { deep: 'value' } });
  });

  it('passes through objects without format property unchanged (structurally)', () => {
    const schema = { simple: { default: 'val', doc: 'A config' } };
    const result = serializeSchema(schema);
    expect(result.simple.default).toBe('val');
    expect(result.simple.doc).toBe('A config');
  });

  it('handles empty object', () => {
    expect(serializeSchema({})).toEqual({});
  });

  it('handles empty array', () => {
    expect(serializeSchema([])).toEqual([]);
  });
});
