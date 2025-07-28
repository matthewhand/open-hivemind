import llmConfig from '../../src/config/llmConfig';

describe('llmConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshLlmConfig = require('../../src/config/llmConfig').default;

    expect(freshLlmConfig.get('LLM_PROVIDER')).toBe('openai');
    expect(freshLlmConfig.get('LLM_PARALLEL_EXECUTION')).toBe(false);

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => llmConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  describe('environment variables', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('should load from environment variables', () => {
      process.env.LLM_PROVIDER = 'flowise';
      process.env.LLM_PARALLEL_EXECUTION = 'true';
      
      const config = require('../../src/config/llmConfig').default;
      expect(config.get('LLM_PROVIDER')).toBe('flowise');
      expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(true);
    });
  });
});