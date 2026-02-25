import { serializeSchema } from '../../src/utils/schemaSerializer';

describe('schemaSerializer', () => {
  it('should serialize simple schema with constructor formats', () => {
    const schema = {
      default: 'foo',
      format: String
    };
    const serialized = serializeSchema(schema);
    expect(serialized).toEqual({
      default: 'foo',
      format: 'String'
    });
  });

  it('should serialize nested schema', () => {
    const schema = {
      group: {
        prop: {
          default: 123,
          format: Number
        }
      }
    };
    const serialized = serializeSchema(schema);
    expect(serialized).toEqual({
      group: {
        prop: {
          default: 123,
          format: 'Number'
        }
      }
    });
  });

  it('should handle Array enum format', () => {
    const schema = {
      default: 'a',
      format: ['a', 'b']
    };
    const serialized = serializeSchema(schema);
    expect(serialized.format).toEqual(['a', 'b']);
  });

  it('should handle custom function format', () => {
    const schema = {
      default: 'a',
      format: (val: any) => { /* check */ }
    };
    const serialized = serializeSchema(schema);
    expect(serialized.format).toBe('function');
  });

  it('should handle Boolean format', () => {
    const schema = {
      default: true,
      format: Boolean
    };
    const serialized = serializeSchema(schema);
    expect(serialized.format).toBe('Boolean');
  });

  it('should handle schema without format', () => {
     const schema = {
         default: 'foo'
     };
     const serialized = serializeSchema(schema);
     expect(serialized.format).toBeUndefined();
     expect(serialized.default).toBe('foo');
  });

  it('should handle null/undefined', () => {
      expect(serializeSchema(null)).toBeNull();
      expect(serializeSchema(undefined)).toBeUndefined();
  });
});
