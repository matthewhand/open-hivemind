import { describe, it, expect } from 'vitest';
import { getProviderSchemasByType, getProviderSchema } from '../index';

/**
 * Guards that the WebUI exposes a config schema for every memory backend that
 * ships as a packages/memory-* workspace package. The backend auto-discovers
 * these packages at runtime; the UI must keep parity so each is configurable.
 */
describe('memory provider config schemas', () => {
  const EXPECTED_BACKENDS = ['mem0', 'mem4ai', 'memvault', 'postgres'];

  it('exposes a schema for all four memory backends', () => {
    const memorySchemas = getProviderSchemasByType('memory');
    const providerTypes = memorySchemas.map((s) => s.providerType).sort();
    expect(providerTypes).toEqual([...EXPECTED_BACKENDS].sort());
  });

  it.each(EXPECTED_BACKENDS)('schema "%s" is well-formed and typed as memory', (providerType) => {
    const schema = getProviderSchema(providerType);
    expect(schema).toBeDefined();
    expect(schema!.type).toBe('memory');
    expect(schema!.providerType).toBe(providerType);
    expect(schema!.displayName).toBeTruthy();
    expect(schema!.description).toBeTruthy();
    expect(Array.isArray(schema!.fields)).toBe(true);
  });

  it('every memory field declares a name, label, and supported type', () => {
    const allowedTypes = new Set([
      'text',
      'password',
      'number',
      'url',
      'json',
      'select',
      'multiselect',
      'boolean',
      'textarea',
      'model-autocomplete',
      'keyvalue',
      'checkbox',
    ]);
    for (const schema of getProviderSchemasByType('memory')) {
      for (const field of schema.fields) {
        expect(field.name, `${schema.providerType} field name`).toBeTruthy();
        expect(field.label, `${schema.providerType}.${field.name} label`).toBeTruthy();
        expect(allowedTypes.has(field.type), `${schema.providerType}.${field.name} type`).toBe(true);
      }
    }
  });
});
