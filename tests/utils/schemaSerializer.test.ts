import { serializeSchema } from '../../src/utils/schemaSerializer';

describe('serializeSchema', () => {
  it('should serialize basic types', () => {
    expect(serializeSchema(String)).toBe('String');
    expect(serializeSchema(Number)).toBe('Number');
    expect(serializeSchema(Boolean)).toBe('Boolean');
  });

  it('should serialize objects recursively', () => {
    const schema = {
      foo: {
        doc: 'foo doc',
        format: String,
        default: 'bar'
      }
    };
    const expected = {
      foo: {
        doc: 'foo doc',
        format: 'String',
        default: 'bar'
      }
    };
    expect(serializeSchema(schema)).toEqual(expected);
  });

  it('should serialize arrays', () => {
    const schema = ['foo', 'bar'];
    expect(serializeSchema(schema)).toEqual(['foo', 'bar']);
  });

  it('should serialize arrays of objects', () => {
    const schema = [{ format: String }];
    expect(serializeSchema(schema)).toEqual([{ format: 'String' }]);
  });

  it('should handle null and undefined', () => {
    expect(serializeSchema(null)).toBeNull();
    expect(serializeSchema(undefined)).toBeUndefined();
  });
});
