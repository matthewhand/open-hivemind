import flowiseConfig from '../../src/config/flowiseConfig';

describe('flowiseConfig', () => {
  it('should have default values', () => {
    // Save original environment variables
    const OLD_ENV = process.env;

    // Reset environment variables to test defaults
    process.env = {};

    // Reset modules to force re-import of config with new environment
    jest.resetModules();
    const freshFlowiseConfig = require('../../src/config/flowiseConfig').default;

    expect(freshFlowiseConfig.get('FLOWISE_API_ENDPOINT')).toBe('');
    expect(freshFlowiseConfig.get('FLOWISE_API_KEY')).toBe('');
    expect(freshFlowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID')).toBe('');
    expect(freshFlowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID')).toBe('');
    expect(freshFlowiseConfig.get('FLOWISE_USE_REST')).toBe(false);

    // Restore original environment variables
    process.env = OLD_ENV;
  });

  it('should validate schema', () => {
    expect(() => flowiseConfig.validate({ allowed: 'strict' })).not.toThrow();
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
      process.env.FLOWISE_API_ENDPOINT = 'http://localhost:3000';
      process.env.FLOWISE_API_KEY = 'test-key';
      process.env.FLOWISE_USE_REST = 'true';
      
      const config = require('../../src/config/flowiseConfig').default;
      expect(config.get('FLOWISE_API_ENDPOINT')).toBe('http://localhost:3000');
      expect(config.get('FLOWISE_API_KEY')).toBe('test-key');
      expect(config.get('FLOWISE_USE_REST')).toBe(true);
    });

  });
});