import llmConfig from '../../src/config/llmConfig';

describe('llmConfig', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
  });

  describe('default configuration', () => {
    it('should have correct default values', () => {
      // Reset environment variables to test defaults
      process.env = {};
      jest.resetModules();
      const freshLlmConfig = require('../../src/config/llmConfig').default;

      expect(freshLlmConfig.get('LLM_PROVIDER')).toBe('openai');
      expect(freshLlmConfig.get('LLM_PARALLEL_EXECUTION')).toBe(false);
    });

    it('should validate schema with default values', () => {
      expect(() => llmConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should have all required configuration keys', () => {
      const requiredKeys = ['LLM_PROVIDER', 'LLM_PARALLEL_EXECUTION'];
      
      requiredKeys.forEach(key => {
        expect(() => llmConfig.get(key)).not.toThrow();
        expect(llmConfig.get(key)).toBeDefined();
      });
    });
  });

  describe('environment variable loading', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    it('should load LLM_PROVIDER from environment', () => {
      const providers = ['openai', 'flowise', 'openwebui'];
      
      providers.forEach(provider => {
        process.env.LLM_PROVIDER = provider;
        jest.resetModules();
        const config = require('../../src/config/llmConfig').default;
        expect(config.get('LLM_PROVIDER')).toBe(provider);
      });
    });

    it('should load LLM_PARALLEL_EXECUTION from environment', () => {
      const testCases = [
        { env: 'true', expected: true },
        { env: 'false', expected: false },
        { env: '1', expected: true },
        { env: '0', expected: false }
      ];
      
      testCases.forEach(({ env, expected }) => {
        process.env.LLM_PARALLEL_EXECUTION = env;
        jest.resetModules();
        const config = require('../../src/config/llmConfig').default;
        expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(expected);
      });
    });

    it('should handle multiple environment variables simultaneously', () => {
      process.env.LLM_PROVIDER = 'flowise';
      process.env.LLM_PARALLEL_EXECUTION = 'true';
      
      jest.resetModules();
      const config = require('../../src/config/llmConfig').default;
      
      expect(config.get('LLM_PROVIDER')).toBe('flowise');
      expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should validate with strict mode', () => {
      expect(() => llmConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should handle invalid provider gracefully', () => {
      process.env.LLM_PROVIDER = 'invalid-provider';
      jest.resetModules();
      
      // Should either throw or use default - test that it doesn't crash
      expect(() => {
        const config = require('../../src/config/llmConfig').default;
        config.get('LLM_PROVIDER');
      }).not.toThrow();
    });

    it('should handle invalid boolean values', () => {
      process.env.LLM_PARALLEL_EXECUTION = 'invalid-boolean';
      jest.resetModules();
      
      expect(() => {
        const config = require('../../src/config/llmConfig').default;
        const value = config.get('LLM_PARALLEL_EXECUTION');
        expect(typeof value).toBe('boolean');
      }).not.toThrow();
    });
  });

  describe('configuration properties', () => {
    it('should return consistent values on multiple calls', () => {
      const provider1 = llmConfig.get('LLM_PROVIDER');
      const provider2 = llmConfig.get('LLM_PROVIDER');
      expect(provider1).toBe(provider2);

      const parallel1 = llmConfig.get('LLM_PARALLEL_EXECUTION');
      const parallel2 = llmConfig.get('LLM_PARALLEL_EXECUTION');
      expect(parallel1).toBe(parallel2);
    });

    it('should have correct data types', () => {
      expect(typeof llmConfig.get('LLM_PROVIDER')).toBe('string');
      expect(typeof llmConfig.get('LLM_PARALLEL_EXECUTION')).toBe('boolean');
    });

    it('should handle case sensitivity in environment variables', () => {
      process.env.llm_provider = 'flowise'; // lowercase
      process.env.LLM_PROVIDER = 'openai';  // uppercase
      
      jest.resetModules();
      const config = require('../../src/config/llmConfig').default;
      
      // Should use the correctly cased version
      expect(config.get('LLM_PROVIDER')).toBe('openai');
    });
  });

  describe('error handling', () => {
    it('should handle missing configuration gracefully', () => {
      expect(() => llmConfig.get('NON_EXISTENT_KEY')).not.toThrow();
    });

    it('should handle empty environment variables', () => {
      process.env.LLM_PROVIDER = '';
      jest.resetModules();
      
      const config = require('../../src/config/llmConfig').default;
      const provider = config.get('LLM_PROVIDER');
      
      // Should either use default or handle empty string appropriately
      expect(typeof provider).toBe('string');
    });
  });
});