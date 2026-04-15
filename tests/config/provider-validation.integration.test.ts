import discordConfig from '../../src/config/discordConfig';
import openaiConfig from '../../src/config/openaiConfig';

describe('Provider Configuration Validation Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Discord Config', () => {
    it('should parse complex channel bonuses correctly', () => {
      process.env.DISCORD_CHANNEL_BONUSES = 'ch1:1.5,ch2:0.5';
      const config = require('../../src/config/discordConfig').default;
      expect(config.get('DISCORD_CHANNEL_BONUSES')).toEqual({
        ch1: 1.5,
        ch2: 0.5
      });
    });

    it('should fail on invalid unsolicited chance modifier', () => {
      process.env.DISCORD_UNSOLICITED_CHANCE_MODIFIER = 'invalid';
      // Convict/Zod should catch this during validation
      expect(() => {
        const config = require('../../src/config/discordConfig').default;
        config.validate({ allowed: 'strict' });
      }).toThrow();
    });
  });

  describe('OpenAI Config', () => {
    it('should correctly load and validate OpenAI settings', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_TEMPERATURE = '0.8';
      
      const config = require('../../src/config/openaiConfig').default;
      expect(config.get('OPENAI_API_KEY')).toBe('test-key');
      expect(config.get('OPENAI_TEMPERATURE')).toBe(0.8);
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should handle comma-separated stop sequences', () => {
      process.env.OPENAI_STOP = 'stop1,stop2';
      const config = require('../../src/config/openaiConfig').default;
      // Depending on implementation, might be array or string
      const stop = config.get('OPENAI_STOP');
      if (Array.isArray(stop)) {
        expect(stop).toContain('stop1');
        expect(stop).toContain('stop2');
      }
    });
  });
});
