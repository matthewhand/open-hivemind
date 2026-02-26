import { serializeSchema } from '../../src/utils/schemaSerializer';

describe('Schema Serialization', () => {
  it('should serialize primitives', () => {
    expect(serializeSchema(1)).toBe(1);
    expect(serializeSchema('str')).toBe('str');
    expect(serializeSchema(true)).toBe(true);
    expect(serializeSchema(null)).toBe(null);
  });

  it('should serialize nested objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    expect(serializeSchema(obj)).toEqual(obj);
  });

  it('should serialize arrays', () => {
    const arr = [1, { a: 2 }];
    expect(serializeSchema(arr)).toEqual(arr);
  });

  it('should transform function formats to string names', () => {
    const schema = {
      prop1: {
        doc: 'Test',
        format: String,
        default: ''
      },
      prop2: {
        format: Number
      },
      prop3: {
        format: Boolean
      },
      prop4: {
        format: Object
      },
      prop5: {
        format: Array
      }
    };

    const expected = {
      prop1: {
        doc: 'Test',
        format: 'String',
        default: ''
      },
      prop2: {
        format: 'Number'
      },
      prop3: {
        format: 'Boolean'
      },
      prop4: {
        format: 'Object'
      },
      prop5: {
        format: 'Array'
      }
    };

    expect(serializeSchema(schema)).toEqual(expected);
  });

  it('should handle custom function format', () => {
    function CustomFormat() { }
    const schema = {
      prop: {
        format: CustomFormat
      }
    };
    expect(serializeSchema(schema)).toEqual({
      prop: {
        format: 'CustomFormat'
      }
    });
  });

  it('should handle leaf node with function format correctly', () => {
    // Sometimes the schema itself is passed as a leaf node
    const schema = {
      doc: 'Test',
      format: String,
      default: 'foo'
    };
    const result = serializeSchema(schema);
    expect(result).toEqual({
      doc: 'Test',
      format: 'String',
      default: 'foo'
    });
  });

  it('should handle anonymous function format by falling back to custom', () => {
    const anonFuncs = [() => { }];
    const schema = {
      prop: {
        format: anonFuncs[0]
      }
    };
    expect(serializeSchema(schema)).toEqual({
      prop: {
        format: 'custom'
      }
    });
  });

  it('should handle string formats', () => {
    const schema = {
      prop: {
        format: 'int'
      }
    };
    expect(serializeSchema(schema)).toEqual(schema);
  });
});
