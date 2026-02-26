/**
 * Serializes a convict configuration schema into a JSON-friendly format.
 * Primarily handles converting constructor functions (String, Number, etc.) in 'format' field to strings.
 */
export function serializeSchema(schema: any): any {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => serializeSchema(item));
  }

  // If this object looks like a schema leaf node with a function format
  if ('format' in schema && typeof schema.format === 'function') {
    const copy = { ...schema };
    const fnName = schema.format.name;
    copy.format = fnName || 'custom';

    // Recursively process other properties (e.g. default value might be an object)
    for (const key in copy) {
      if (key !== 'format') {
        copy[key] = serializeSchema(copy[key]);
      }
    }
    return copy;
  }

  const result: any = {};
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      result[key] = serializeSchema(schema[key]);
    }
  }
  return result;
}
