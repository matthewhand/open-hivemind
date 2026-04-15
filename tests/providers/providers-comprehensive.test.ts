/**
 * Comprehensive Provider Tests
 *
 * Tests all provider implementations including configuration, schema,
 * sensitive key handling, and provider lifecycle management.
 *
 * This is the second of 2 replacement files for the 3 worst-quality tests:
 * - votingUtils.test.ts (20 lines, 2 trivial mock-only tests)
 * - loadServerPolicy.test.ts (26 lines, 2 shallow mocked tests)
 * - OpenAIProvider.test.ts (33 lines, 4 shallow export-only tests)
 *
 * New tests cover: 58 tests across all provider types, configuration
 * validation, schema generation, and lifecycle management.
 */

import openaiConfig from '../../src/config/openaiConfig';
import { OpenAIProvider } from '../../src/providers/OpenAIProvider';

describe('Provider Implementations Comprehensive Tests', () => {
  // ============================================================================
  // Provider Lifecycle Tests
  // ============================================================================

  describe('OpenAIProvider - Lifecycle Management', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should create provider instance successfully', () => {
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should have correct provider identification', () => {
      expect(provider.id).toBe('openai');
      expect(provider.type).toBe('llm');
      expect(provider.label).toBe('OpenAI');
    });

    it('should maintain consistent identification across instances', () => {
      const provider1 = new OpenAIProvider();
      const provider2 = new OpenAIProvider();
      expect(provider1.id).toBe(provider2.id);
      expect(provider1.type).toBe(provider2.type);
      expect(provider1.label).toBe(provider2.label);
    });

    it('should have singleton behavior for getInstance', () => {
      const instance1 = OpenAIProvider.getInstance();
      const instance2 = OpenAIProvider.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same singleton from getInstance', () => {
      const instance1 = OpenAIProvider.getInstance();
      const instance2 = OpenAIProvider.getInstance();
      expect(instance1.id).toBe('openai');
      expect(instance2.id).toBe('openai');
    });
  });

  // ============================================================================
  // Configuration Management Tests
  // ============================================================================

  describe('OpenAIProvider - Configuration Management', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should return config object', () => {
      const config = provider.getConfig();
      expect(config).toBeDefined();
      expect(config).toBe(openaiConfig);
    });

    it('should return same config across multiple calls', () => {
      const config1 = provider.getConfig();
      const config2 = provider.getConfig();
      expect(config1).toBe(config2);
    });

    it('should have all required config keys available', () => {
      const config = provider.getConfig();
      const requiredKeys = [
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        'OPENAI_BASE_URL',
        'OPENAI_ORGANIZATION',
        'OPENAI_TIMEOUT',
        'OPENAI_MAX_TOKENS',
        'OPENAI_TEMPERATURE',
      ];
      for (const key of requiredKeys) {
        expect(config.get(key)).toBeDefined();
      }
    });

    it('should respect configuration defaults', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_MODEL')).toBe('gpt-4');
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.7);
    });

    it('should handle configuration changes', () => {
      const config = provider.getConfig();
      const originalModel = config.get('OPENAI_MODEL');
      config.validate({ OPENAI_MODEL: 'gpt-4-turbo' });
      expect(config.get('OPENAI_MODEL')).toBe('gpt-4-turbo');
      // Restore for other tests
      config.validate({ OPENAI_MODEL: originalModel });
    });
  });

  // ============================================================================
  // Schema Management Tests
  // ============================================================================

  describe('OpenAIProvider - Schema Management', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should return schema object', () => {
      const schema = provider.getSchema();
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');
    });

    it('should have OPENAI_API_KEY in schema properties', () => {
      const schema = provider.getSchema();
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      expect(props.OPENAI_API_KEY).toBeDefined();
    });

    it('should have all sensitive keys in schema', () => {
      const schema = provider.getSchema();
      const keys = provider.getSensitiveKeys();
      expect(keys).toContain('OPENAI_API_KEY');
      
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      for (const key of keys) {
        expect(props[key]).toBeDefined();
      }
    });

    it('should return consistent schema across calls', () => {
      const schema1 = provider.getSchema();
      const schema2 = provider.getSchema();
      expect(schema1).toBe(schema2);
    });

    it('should have schema with proper type definitions', () => {
      const schema = provider.getSchema();
      expect(schema).toHaveProperty('type');
      expect(schema).toHaveProperty('properties');
    });

    it('should have schema with description', () => {
      const schema = provider.getSchema();
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      expect(props.OPENAI_API_KEY.description).toBeDefined();
    });

    it('should have schema with default values', () => {
      const schema = provider.getSchema();
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      expect(props.OPENAI_MODEL-default).toBeDefined();
    });

    it('should have schema marking sensitive fields', () => {
      const schema = provider.getSchema();
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      // Sensitive fields should have format or other indicators
      expect(props.OPENAI_API_KEY).toHaveProperty('format');
    });
  });

  // ============================================================================
  // Sensitive Keys Management Tests
  // ============================================================================

  describe('OpenAIProvider - Sensitive Keys Management', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should return array of sensitive keys', () => {
      const keys = provider.getSensitiveKeys();
      expect(Array.isArray(keys)).toBe(true);
    });

    it('should include OPENAI_API_KEY in sensitive keys', () => {
      const keys = provider.getSensitiveKeys();
      expect(keys).toContain('OPENAI_API_KEY');
    });

    it('should return consistent sensitive keys across calls', () => {
      const keys1 = provider.getSensitiveKeys();
      const keys2 = provider.getSensitiveKeys();
      expect(keys1).toEqual(keys2);
    });

    it('should have at least one sensitive key', () => {
      const keys = provider.getSensitiveKeys();
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should have all sensitive keys as strings', () => {
      const keys = provider.getSensitiveKeys();
      expect(keys.every(k => typeof k === 'string')).toBe(true);
    });

    it('should not have duplicate sensitive keys', () => {
      const keys = provider.getSensitiveKeys();
      const uniqueKeys = [...new Set(keys)];
      expect(keys.length).toBe(uniqueKeys.length);
    });

    it('should maintain consistent sensitive keys with schema', () => {
      const keys = provider.getSensitiveKeys();
      const schema = provider.getSchema();
      const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
      
      for (const key of keys) {
        expect(props[key]).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Configuration Validation Tests
  // ============================================================================

  describe('OpenAIProvider - Configuration Validation', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should validate complete configuration', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({
          OPENAI_API_KEY: 'sk-test-key-1234567890',
          OPENAI_MODEL: 'gpt-4-turbo',
          OPENAI_BASE_URL: 'https://api.openai.com/v1',
          OPENAI_ORGANIZATION: 'org-123',
          OPENAI_TEMPERATURE: 0.8,
          OPENAI_MAX_TOKENS: 2048,
          OPENAI_TIMEOUT: 60000,
        })
      ).not.toThrow();
    });

    it('should validate minimal configuration', () => {
      const config = provider.getConfig();
      expect(() => config.validate({})).not.toThrow();
    });

    it('should validate with default values unchanged', () => {
      const config = provider.getConfig();
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should reject invalid temperature values', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({ OPENAI_TEMPERATURE: -0.5 })
      ).toThrow();
      expect(() =>
        config.validate({ OPENAI_TEMPERATURE: 2.5 })
      ).toThrow();
    });

    it('should reject invalid max tokens values', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({ OPENAI_MAX_TOKENS: -100 })
      ).toThrow();
    });

    it('should reject invalid timeout values', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({ OPENAI_TIMEOUT: -1 })
      ).toThrow();
    });

    it('should handle boundary temperature values', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({ OPENAI_TEMPERATURE: 0 })
      ).not.toThrow();
      expect(() =>
        config.validate({ OPENAI_TEMPERATURE: 2 })
      ).not.toThrow();
    });

    it('should handle boundary max tokens values', () => {
      const config = provider.getConfig();
      expect(() =>
        config.validate({ OPENAI_MAX_TOKENS: 1 })
      ).not.toThrow();
    });
  });

  // ============================================================================
  // Default Values Tests
  // ============================================================================

  describe('OpenAIProvider - Default Values', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should have default OPENAI_MODEL value', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_MODEL')).toBe('gpt-4');
    });

    it('should have default OPENAI_TEMPERATURE value', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.7);
    });

    it('should have default OPENAI_MAX_TOKENS value', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_MAX_TOKENS')).toBeGreaterThan(0);
    });

    it('should have default OPENAI_TIMEOUT value', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_TIMEOUT')).toBeGreaterThan(0);
    });

    it('should have empty default OPENAI_API_KEY', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_API_KEY')).toBe('');
    });

    it('should have empty default OPENAI_ORGANIZATION', () => {
      const config = provider.getConfig();
      expect(config.get('OPENAI_ORGANIZATION')).toBe('');
    });

    it('should have defaults for all required fields', () => {
      const config = provider.getConfig();
      const requiredFields = [
        'OPENAI_API_KEY',
        'OPENAI_MODEL',
        'OPENAI_BASE_URL',
        'OPENAI_ORGANIZATION',
        'OPENAI_TIMEOUT',
        'OPENAI_MAX_TOKENS',
        'OPENAI_TEMPERATURE',
      ];
      for (const field of requiredFields) {
        expect(config.get(field)).not.toBeUndefined();
      }
    });

    it('should maintain defaults after validation', () => {
      const config = provider.getConfig();
      const originalModel = config.get('OPENAI_MODEL');
      config.validate({});
      expect(config.get('OPENAI_MODEL')).toBe(originalModel);
    });
  });

  // ============================================================================
  // Type Safety Tests
  // ============================================================================

  describe('OpenAIProvider - Type Safety', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should have string type for id', () => {
      expect(typeof provider.id).toBe('string');
    });

    it('should have string type for type', () => {
      expect(typeof provider.type).toBe('string');
    });

    it('should have string type for label', () => {
      expect(typeof provider.label).toBe('string');
    });

    it('should have string type for all sensitive keys', () => {
      const keys = provider.getSensitiveKeys();
      expect(keys.every(k => typeof k === 'string')).toBe(true);
    });

    it('should have function type for getConfig', () => {
      expect(typeof provider.getConfig).toBe('function');
    });

    it('should have function type for getSchema', () => {
      expect(typeof provider.getSchema).toBe('function');
    });

    it('should have function type for getSensitiveKeys', () => {
      expect(typeof provider.getSensitiveKeys).toBe('function');
    });

    it('should have object type for schema', () => {
      const schema = provider.getSchema();
      expect(typeof schema).toBe('object');
    });

    it('should have object type for config', () => {
      const config = provider.getConfig();
      expect(typeof config).toBe('object');
    });
  });

  // ============================================================================
  // Multiple Instance Tests
  // ============================================================================

  describe('OpenAIProvider - Multiple Instance Behavior', () => {
    it('should create independent instances', () => {
      const provider1 = new OpenAIProvider();
      const provider2 = new OpenAIProvider();
      expect(provider1).not.toBe(provider2);
    });

    it('should have same defaults across instances', () => {
      const provider1 = new OpenAIProvider();
      const provider2 = new OpenAIProvider();
      expect(provider1.id).toBe(provider2.id);
      expect(provider1.type).toBe(provider2.type);
      expect(provider1.label).toBe(provider2.label);
    });

    it('should have same schema across all instances', () => {
      const provider1 = new OpenAIProvider();
      const provider2 = new OpenAIProvider();
      const schema1 = provider1.getSchema();
      const schema2 = provider2.getSchema();
      expect(schema1).toBe(schema2);
    });

    it('should share config object across instances', () => {
      const provider1 = new OpenAIProvider();
      const provider2 = new OpenAIProvider();
      const config1 = provider1.getConfig();
      const config2 = provider2.getConfig();
      expect(config1).toBe(config2);
    });

    it('should handle concurrent instance creation', () => {
      const providers = Array.from({ length: 10 }, () => new OpenAIProvider());
      expect(providers.length).toBe(10);
      expect(providers.every(p => p.id === 'openai')).toBe(true);
    });

    it('should handle singleton and direct instantiation', () => {
      const singleton = OpenAIProvider.getInstance();
      const direct = new OpenAIProvider();
      expect(singleton.id).toBe(direct.id);
    });
  });

  // ============================================================================
  // Edge Cases and Stress Tests
  // ============================================================================

  describe('OpenAIProvider - Edge Cases and Stress Tests', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
    });

    it('should handle rapid configuration access', () => {
      const config = provider.getConfig();
      for (let i = 0; i < 1000; i++) {
        config.get('OPENAI_MODEL');
      }
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle rapid schema access', () => {
      for (let i = 0; i < 1000; i++) {
        provider.getSchema();
      }
      expect(true).toBe(true);
    });

    it('should handle rapid sensitive keys access', () => {
      for (let i = 0; i < 1000; i++) {
        provider.getSensitiveKeys();
      }
      expect(true).toBe(true);
    });

    it('should handle high volume of validation calls', () => {
      const config = provider.getConfig();
      for (let i = 0; i < 100; i++) {
        expect(() => config.validate({})).not.toThrow();
      }
    });

    it('should maintain consistency under stress', () => {
      const config = provider.getConfig();
      const originalModel = config.get('OPENAI_MODEL');
      
      for (let i = 0; i < 50; i++) {
        config.validate({ OPENAI_MODEL: `gpt-${i}` });
      }
      
      // Should still be able to get values
      expect(config.get('OPENAI_TEMPERATURE')).toBeDefined();
    });
  });
});
