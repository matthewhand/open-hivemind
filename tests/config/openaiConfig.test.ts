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
      expect(openaiConfig.get('OPENAI_MODEL')).toBe('university');
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
      process.env.OPENAI_ORGANIZATION = 'org-test';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(config.get('OPENAI_API_KEY')).toBe('sk-test123456789');
      expect(config.get('OPENAI_MODEL')).toBe('gpt-4');
      expect(config.get('OPENAI_BASE_URL')).toBe('https://api.openai.com/v1');
      expect(config.get('OPENAI_ORGANIZATION')).toBe('org-test');
    });

    it('should load numeric values from environment', () => {
      process.env.OPENAI_TEMPERATURE = '0.8';
      process.env.OPENAI_MAX_TOKENS = '200';
      process.env.OPENAI_TIMEOUT = '15000';
      process.env.OPENAI_MAX_RETRIES = '5';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.8);
      expect(config.get('OPENAI_MAX_TOKENS')).toBe(200);
      expect(config.get('OPENAI_TIMEOUT')).toBe(15000);
      expect(config.get('OPENAI_MAX_RETRIES')).toBe(5);
    });

    it('should load penalty values from environment', () => {
      process.env.OPENAI_FREQUENCY_PENALTY = '0.2';
      process.env.OPENAI_PRESENCE_PENALTY = '0.1';
      process.env.OPENAI_TOP_P = '0.95';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(config.get('OPENAI_FREQUENCY_PENALTY')).toBe(0.2);
      expect(config.get('OPENAI_PRESENCE_PENALTY')).toBe(0.1);
      expect(config.get('OPENAI_TOP_P')).toBe(0.95);
    });

    it('should handle complex configuration combinations', () => {
      process.env.OPENAI_API_KEY = 'sk-complex123';
      process.env.OPENAI_MODEL = 'gpt-3.5-turbo';
      process.env.OPENAI_TEMPERATURE = '0.5';
      process.env.OPENAI_SYSTEM_PROMPT = 'You are a helpful assistant.';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(config.get('OPENAI_API_KEY')).toBe('sk-complex123');
      expect(config.get('OPENAI_MODEL')).toBe('gpt-3.5-turbo');
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.5);
      expect(config.get('OPENAI_SYSTEM_PROMPT')).toBe('You are a helpful assistant.');
    });
  });

  describe('configuration validation', () => {
    it('should validate with strict mode', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(() => openaiConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should handle temperature bounds', () => {
      const temperatures = ['0.0', '0.5', '1.0', '2.0'];
      
      temperatures.forEach(temp => {
        process.env.OPENAI_TEMPERATURE = temp;
        jest.resetModules();
        
        expect(() => {
          const config = require('../../src/config/openaiConfig').default;
          const value = config.get('OPENAI_TEMPERATURE');
          expect(typeof value).toBe('number');
          expect(value).toBeGreaterThanOrEqual(0);
        }).not.toThrow();
      });
    });

    it('should handle penalty value bounds', () => {
      process.env.OPENAI_FREQUENCY_PENALTY = '0.0';
      process.env.OPENAI_PRESENCE_PENALTY = '2.0';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(config.get('OPENAI_FREQUENCY_PENALTY')).toBe(0.0);
      expect(config.get('OPENAI_PRESENCE_PENALTY')).toBe(2.0);
    });

    it('should validate API key format expectations', () => {
      const apiKeys = ['sk-test123', '', 'invalid-key', 'sk-' + 'x'.repeat(48)];
      
      apiKeys.forEach(key => {
        process.env.OPENAI_API_KEY = key;
        jest.resetModules();
        
        expect(() => {
          const config = require('../../src/config/openaiConfig').default;
          const value = config.get('OPENAI_API_KEY');
          expect(typeof value).toBe('string');
        }).not.toThrow();
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle invalid numeric values gracefully', () => {
      process.env.OPENAI_TEMPERATURE = 'invalid-number';
      process.env.OPENAI_MAX_TOKENS = 'not-a-number';
      
      jest.resetModules();
      
      expect(() => {
        const config = require('../../src/config/openaiConfig').default;
        // Should either use defaults or handle gracefully
        const temp = config.get('OPENAI_TEMPERATURE');
        const tokens = config.get('OPENAI_MAX_TOKENS');
        expect(typeof temp).toBe('number');
        expect(typeof tokens).toBe('number');
      }).not.toThrow();
    });

    it('should handle empty environment variables', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.OPENAI_MODEL = '';
      process.env.OPENAI_SYSTEM_PROMPT = '';
      
      jest.resetModules();
      const config = require('../../src/config/openaiConfig').default;
      
      expect(typeof config.get('OPENAI_API_KEY')).toBe('string');
      expect(typeof config.get('OPENAI_MODEL')).toBe('string');
      expect(typeof config.get('OPENAI_SYSTEM_PROMPT')).toBe('string');
    });

    it('should handle missing configuration keys gracefully', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      expect(() => openaiConfig.get('NON_EXISTENT_KEY')).toThrow();
    });

    it('should maintain consistency across multiple calls', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      const key1 = openaiConfig.get('OPENAI_API_KEY');
      const key2 = openaiConfig.get('OPENAI_API_KEY');
      expect(key1).toBe(key2);

      const temp1 = openaiConfig.get('OPENAI_TEMPERATURE');
      const temp2 = openaiConfig.get('OPENAI_TEMPERATURE');
      expect(temp1).toBe(temp2);
    });
  });

  describe('configuration data types', () => {
    it('should return correct data types for all configuration keys', () => {
      // Import the config module after clearing environment variables
      const openaiConfig = require('../../src/config/openaiConfig').default;
      const stringKeys = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL', 'OPENAI_SYSTEM_PROMPT'];
      const numberKeys = ['OPENAI_TEMPERATURE', 'OPENAI_MAX_TOKENS', 'OPENAI_TIMEOUT'];
      const arrayKeys = ['OPENAI_STOP'];
      
      stringKeys.forEach(key => {
        expect(typeof openaiConfig.get(key)).toBe('string');
      });
      
      numberKeys.forEach(key => {
        expect(typeof openaiConfig.get(key)).toBe('number');
      });
      
      arrayKeys.forEach(key => {
        expect(Array.isArray(openaiConfig.get(key))).toBe(true);
      });
    });

    it('should handle URL validation', () => {
      const urls = [
        'http://localhost:8000/v1/',
        'https://api.openai.com/v1',
        'https://custom-endpoint.com/v1/'
      ];
      
      urls.forEach(url => {
        process.env.OPENAI_BASE_URL = url;
        jest.resetModules();
        
        const config = require('../../src/config/openaiConfig').default;
        const baseUrl = config.get('OPENAI_BASE_URL');
        expect(typeof baseUrl).toBe('string');
        expect(baseUrl).toBe(url);
      });
    });
  });
});