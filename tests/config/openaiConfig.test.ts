import openaiConfig from '../../src/config/openaiConfig';

describe('openaiConfig', () => {
  const OLD_ENV = process.env;

  afterEach(() => {
    process.env = OLD_ENV;
    jest.resetModules();
  });

  beforeEach(() => {
    // Clear OPENAI_BASE_URL to test defaults
    delete process.env.OPENAI_BASE_URL;
    // Also clear any other OpenAI env vars that might interfere
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_ORGANIZATION;
    delete process.env.OPENAI_TEMPERATURE;
    delete process.env.OPENAI_MAX_TOKENS;
    delete process.env.OPENAI_FREQUENCY_PENALTY;
    delete process.env.OPENAI_PRESENCE_PENALTY;
    delete process.env.OPENAI_TIMEOUT;
    delete process.env.OPENAI_STOP;
    delete process.env.OPENAI_TOP_P;
    delete process.env.OPENAI_SYSTEM_PROMPT;
    delete process.env.OPENAI_RESPONSE_MAX_TOKENS;
    delete process.env.OPENAI_MAX_RETRIES;
    delete process.env.OPENAI_FINISH_REASON_RETRY;
    delete process.env.OPENAI_VOICE;
    jest.resetModules();
  });

  describe('default configuration values', () => {
    it('should have correct default string values', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(typeof openaiConfig.get('OPENAI_API_KEY')).toBe('string');
      expect(openaiConfig.get('OPENAI_BASE_URL')).toBe('https://api.openai.com/v1');
      expect(openaiConfig.get('OPENAI_ORGANIZATION')).toBe('');
      expect(openaiConfig.get('OPENAI_MODEL')).toBe('gpt-5.2');
      expect(openaiConfig.get('OPENAI_SYSTEM_PROMPT')).toBe('Greetings, human...');
      expect(openaiConfig.get('OPENAI_FINISH_REASON_RETRY')).toBe('stop');
      expect(openaiConfig.get('OPENAI_VOICE')).toBe('nova');
    });

    it('should have correct default numeric values', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(openaiConfig.get('OPENAI_TEMPERATURE')).toBe(0.7);
      expect(openaiConfig.get('OPENAI_MAX_TOKENS')).toBe(150);
      expect(openaiConfig.get('OPENAI_FREQUENCY_PENALTY')).toBe(0.1);
      expect(openaiConfig.get('OPENAI_PRESENCE_PENALTY')).toBe(0.05);
      expect(openaiConfig.get('OPENAI_TIMEOUT')).toBe(10000);
      expect(openaiConfig.get('OPENAI_TOP_P')).toBe(1.0);
      expect(openaiConfig.get('OPENAI_RESPONSE_MAX_TOKENS')).toBe(100);
      expect(openaiConfig.get('OPENAI_MAX_RETRIES')).toBe(3);
    });

    it('should have correct default array values', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(openaiConfig.get('OPENAI_STOP')).toEqual([]);
      expect(Array.isArray(openaiConfig.get('OPENAI_STOP'))).toBe(true);
    });

    it('should validate schema with defaults', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(() => openaiConfig.validate({ allowed: 'strict' })).not.toThrow();
    });
  });

  describe('environment variable loading', () => {
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    it('should load string values from environment', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(openaiConfig.get('OPENAI_API_KEY')).toBe('sk-test123456789');
      expect(openaiConfig.get('OPENAI_MODEL')).toBe('gpt-4');
      expect(openaiConfig.get('OPENAI_BASE_URL')).toBe('https://api.openai.com/v1');
    });

    it('should load numeric values from environment', () => {
      process.env.OPENAI_TEMPERATURE = '0.5';
      process.env.OPENAI_MAX_TOKENS = '250';
      
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(openaiConfig.get('OPENAI_TEMPERATURE')).toBe(0.5);
      expect(openaiConfig.get('OPENAI_MAX_TOKENS')).toBe(250);
    });

    it('should load array values from environment', () => {
      process.env.OPENAI_STOP = 'stop1,stop2';
      
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(openaiConfig.get('OPENAI_STOP')).toEqual(['stop1', 'stop2']);
    });
  });
});
