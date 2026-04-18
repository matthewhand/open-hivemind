import convict from 'convict';

describe('llmConfig Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear relevant env vars
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_PARALLEL_EXECUTION;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load default values when no environment variables are set', () => {
    const config = require('../../src/config/llmConfig').default;
    expect(config.get('LLM_PROVIDER')).toBe('openai');
    expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(false);
  });

  it('should override values from environment variables', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    const config = require('../../src/config/llmConfig').default;
    expect(config.get('LLM_PROVIDER')).toBe('anthropic');
  });

  [
    { input: 'true', expected: true },
    { input: '1', expected: true },
    { input: 'false', expected: false },
    { input: '0', expected: false }
  ].forEach(({ input, expected }) => {
    it(`should correctly coerce LLM_PARALLEL_EXECUTION="${input}" to ${expected}`, () => {
      process.env.LLM_PARALLEL_EXECUTION = input;
      const config = require('../../src/config/llmConfig').default;
      expect(config.get('LLM_PARALLEL_EXECUTION')).toBe(expected);
    });
  });
});
