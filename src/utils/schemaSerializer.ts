/**
 * Serializes a convict schema object into a JSON-friendly format.
 * Converts constructor functions (String, Number, Boolean, etc.) in 'format' fields to their string names.
 * Recursively traverses the object.
 *
 * @param schema The convict schema object or any part of it.
 * @returns The serialized schema.
 */
export function serializeSchema(schema: any): any {
  if (schema === null || schema === undefined) {
    return schema;
  }

  // Handle constructor functions (e.g., String, Number, Boolean)
  if (typeof schema === 'function') {
    return schema.name || 'Function';
  }

  if (Array.isArray(schema)) {
    return schema.map(serializeSchema);
  }

  if (typeof schema === 'object') {
    const serialized: any = {};
    for (const key in schema) {
      if (Object.prototype.hasOwnProperty.call(schema, key)) {
        serialized[key] = serializeSchema(schema[key]);
      }
    }
    return serialized;
  }

  return schema;
}
