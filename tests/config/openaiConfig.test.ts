import openaiConfig from '../../src/config/openaiConfig';

describe('openaiConfig', () => {
  it('should have default values', () => {
    expect(openaiConfig.get('OPENAI_API_KEY')).toBe('a7c108bb78eb3dff19ad34f03d70695765abd3a09a80d05f33a93dca97ec3367');
    expect(openaiConfig.get('OPENAI_TEMPERATURE')).toBe(0.7);
    expect(openaiConfig.get('OPENAI_MAX_TOKENS')).toBe(150);
    expect(openaiConfig.get('OPENAI_FREQUENCY_PENALTY')).toBe(0.1);
    expect(openaiConfig.get('OPENAI_PRESENCE_PENALTY')).toBe(0.05);
    expect(openaiConfig.get('OPENAI_BASE_URL')).toBe('http://localhost:8000/v1/');
    expect(openaiConfig.get('OPENAI_TIMEOUT')).toBe(10000);
    expect(openaiConfig.get('OPENAI_ORGANIZATION')).toBe('');
    expect(openaiConfig.get('OPENAI_MODEL')).toBe('university');
    expect(openaiConfig.get('OPENAI_STOP')).toEqual(['']);
    expect(openaiConfig.get('OPENAI_TOP_P')).toBe(0.9);
    expect(openaiConfig.get('OPENAI_SYSTEM_PROMPT')).toBe('You are a bot that assists slack users.');
    expect(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS')).toBe(100);
    expect(openaiConfig.get('OPENAI_MAX_RETRIES')).toBe(3);
    expect(openaiConfig.get('OPENAI_FINISH_REASON_RETRY')).toBe('stop');
    expect(openaiConfig.get('OPENAI_VOICE')).toBe('nova');
  });

  it('should validate schema', () => {
    expect(() => openaiConfig.validate({ allowed: 'strict' })).not.toThrow();
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
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.OPENAI_TEMPERATURE = '0.8';
      
      const config = require('../../src/config/openaiConfig').default;
      expect(config.get('OPENAI_API_KEY')).toBe('test-key');
      expect(config.get('OPENAI_MODEL')).toBe('gpt-4');
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.8);
    });
  });
});