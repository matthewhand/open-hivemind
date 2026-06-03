/**
 * Serializes a convict configuration schema into a JSON-friendly format.
 * Primarily handles converting constructor functions (String, Number, etc.) in 'format' field to strings.
 */
export function serializeSchema(schema: unknown): unknown {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => serializeSchema(item));
  }

  const obj = schema as Record<string, unknown>;

  // If this object looks like a schema leaf node with a function format
  if ('format' in obj && typeof obj.format === 'function') {
    const copy = { ...obj };

    const fnName = (obj.format as any).name;
    copy.format = fnName || 'custom';

    // Recursively process other properties (e.g. default value might be an object)
    for (const key in copy) {
      if (key !== 'format') {
        copy[key] = serializeSchema(copy[key]);
      }
    }
    return copy;
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = serializeSchema(obj[key]);
    }
  }
  return result;
}
