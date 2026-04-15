import llmConfig from '../../src/config/llmConfig';

describe('llmConfig Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default values when no environment variables are set', () => {
    delete process.env.LLM_PROVIDER;
    delete process.env.DEFAULT_EMBEDDING_PROVIDER;
    delete process.env.LLM_PARALLEL_EXECUTION;

    // We need to reload the module to pick up the changes
    const config = require('../../src/config/llmConfig').default;
    
    expect(config.get('LLM_PROVIDER')).toBe('openai');
    expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(false);
  });

  it('should override values from environment variables', () => {
    process.env.LLM_PROVIDER = 'flowise';
    process.env.DEFAULT_EMBEDDING_PROVIDER = 'test-provider';
    
    const config = require('../../src/config/llmConfig').default;
    
    expect(config.get('LLM_PROVIDER')).toBe('flowise');
    expect(config.get('DEFAULT_EMBEDDING_PROVIDER')).toBe('test-provider');
  });

  it('should correctly coerce LLM_PARALLEL_EXECUTION string to boolean', () => {
    const testCases = [
      { input: 'true', expected: true },
      { input: '1', expected: true },
      { input: 'TRUE', expected: true },
      { input: 'false', expected: false },
      { input: '0', expected: false },
      { input: 'anything-else', expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
      process.env.LLM_PARALLEL_EXECUTION = input;
      jest.resetModules();
      const config = require('../../src/config/llmConfig').default;
      expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(expected);
    });
  });
});
