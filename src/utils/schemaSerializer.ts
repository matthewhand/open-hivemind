
/**
 * Serializes a convict schema object into a JSON-friendly format.
 * Converts constructor functions (String, Number, Boolean) in 'format' to strings.
 */
export function serializeSchema(schema: any): any {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  // Check if it's a schema property (has 'default' key)
  // Note: We check strict existence because default could be null or false
  if (Object.prototype.hasOwnProperty.call(schema, 'default')) {
    const copy = { ...schema };

    // Serialize 'format'
    if (copy.format) {
      if (typeof copy.format === 'function') {
        // Handle constructors like String, Number, Boolean
        if (copy.format === String) copy.format = 'String';
        else if (copy.format === Number) copy.format = 'Number';
        else if (copy.format === Boolean) copy.format = 'Boolean';
        else if (copy.format === Object) copy.format = 'Object';
        else if (copy.format === Array) copy.format = 'Array';
        else copy.format = 'function'; // custom validation function
      } else if (Array.isArray(copy.format)) {
        // Enum
        copy.format = copy.format;
      }
      // if string, leave as is
    }
    return copy;
  }

  // Recursive case for nested objects
  const result: any = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      result[key] = serializeSchema(schema[key]);
    }
  }
  return result;
}
