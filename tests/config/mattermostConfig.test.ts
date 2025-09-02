import mattermostConfig from '../../src/config/mattermostConfig';

describe('mattermostConfig', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('Default configuration values', () => {
    it('should have default values when no environment variables are set', () => {
      // Reset environment variables to test defaults
      process.env = {};

      // Reset modules to force re-import of config with new environment
      jest.resetModules();
      const freshMattermostConfig = require('../../src/config/mattermostConfig').default;

      expect(freshMattermostConfig.get('MATTERMOST_SERVER_URL')).toBe('');
      expect(freshMattermostConfig.get('MATTERMOST_TOKEN')).toBe('');
      expect(freshMattermostConfig.get('MATTERMOST_CHANNEL')).toBe('');
    });

    it('should handle partial environment variable configuration', () => {
      process.env = {
        MATTERMOST_SERVER_URL: 'http://localhost:8065'
        // Other variables intentionally missing
      };

      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      expect(config.get('MATTERMOST_TOKEN')).toBe('');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('');
    });

    it('should provide consistent default values across multiple imports', () => {
      process.env = {};
      jest.resetModules();
      
      const config1 = require('../../src/config/mattermostConfig').default;
      const config2 = require('../../src/config/mattermostConfig').default;
      
      expect(config1.get('MATTERMOST_SERVER_URL')).toBe(config2.get('MATTERMOST_SERVER_URL'));
      expect(config1.get('MATTERMOST_TOKEN')).toBe(config2.get('MATTERMOST_TOKEN'));
      expect(config1.get('MATTERMOST_CHANNEL')).toBe(config2.get('MATTERMOST_CHANNEL'));
    });
  });

  describe('Schema validation', () => {
    it('should validate schema with strict mode', () => {
      expect(() => mattermostConfig.validate({ allowed: 'strict' })).not.toThrow();
    });

    it('should validate schema with default settings', () => {
      expect(() => mattermostConfig.validate()).not.toThrow();
    });

    it('should validate schema with different validation options', () => {
      expect(() => mattermostConfig.validate({ allowed: 'warn' })).not.toThrow();
      expect(() => mattermostConfig.validate({ format: 'json' })).not.toThrow();
    });

    it('should handle validation with populated configuration', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      process.env.MATTERMOST_TOKEN = 'test-token';
      process.env.MATTERMOST_CHANNEL = 'test-channel';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
    });
  });

  describe('Environment variable loading', () => {
    it('should load from environment variables', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      process.env.MATTERMOST_TOKEN = 'test-token';
      process.env.MATTERMOST_CHANNEL = 'test-channel';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      expect(config.get('MATTERMOST_TOKEN')).toBe('test-token');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('test-channel');
    });

    it('should handle different URL formats', () => {
      const urlFormats = [
        'http://localhost:8065',
        'https://mattermost.example.com',
        'https://chat.company.com:8443',
        'http://192.168.1.100:8065'
      ];

      urlFormats.forEach(url => {
        process.env = { MATTERMOST_SERVER_URL: url };
        jest.resetModules();
        const config = require('../../src/config/mattermostConfig').default;
        expect(config.get('MATTERMOST_SERVER_URL')).toBe(url);
      });
    });

    it('should handle different token formats', () => {
      const tokenFormats = [
        'abc123def456',
        'token_with_underscores',
        'TOKEN-WITH-DASHES',
        'very-long-token-string-with-many-characters-1234567890'
      ];

      tokenFormats.forEach(token => {
        process.env = { MATTERMOST_TOKEN: token };
        jest.resetModules();
        const config = require('../../src/config/mattermostConfig').default;
        expect(config.get('MATTERMOST_TOKEN')).toBe(token);
      });
    });

    it('should handle different channel formats', () => {
      const channelFormats = [
        'general',
        'team-chat',
        'development_team',
        'Channel With Spaces',
        'channel123'
      ];

      channelFormats.forEach(channel => {
        process.env = { MATTERMOST_CHANNEL: channel };
        jest.resetModules();
        const config = require('../../src/config/mattermostConfig').default;
        expect(config.get('MATTERMOST_CHANNEL')).toBe(channel);
      });
    });
  });

  describe('Configuration properties and methods', () => {
    it('should have required configuration methods', () => {
      expect(typeof mattermostConfig.get).toBe('function');
      expect(typeof mattermostConfig.validate).toBe('function');
    });

    it('should handle case-sensitive property names', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      expect(config.get('mattermost_server_url')).not.toBe('http://localhost:8065');
    });

    it('should return undefined for non-existent properties', () => {
      expect(mattermostConfig.get('NON_EXISTENT_PROPERTY')).toBeUndefined();
      expect(mattermostConfig.get('')).toBeUndefined();
    });

    it('should handle null and undefined property requests', () => {
      expect(() => mattermostConfig.get(null as any)).not.toThrow();
      expect(() => mattermostConfig.get(undefined as any)).not.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty string environment variables', () => {
      process.env.MATTERMOST_SERVER_URL = '';
      process.env.MATTERMOST_TOKEN = '';
      process.env.MATTERMOST_CHANNEL = '';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('');
      expect(config.get('MATTERMOST_TOKEN')).toBe('');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('');
    });

    it('should handle whitespace-only environment variables', () => {
      process.env.MATTERMOST_SERVER_URL = '   ';
      process.env.MATTERMOST_TOKEN = '\t\n';
      process.env.MATTERMOST_CHANNEL = '  \t  ';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('   ');
      expect(config.get('MATTERMOST_TOKEN')).toBe('\t\n');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('  \t  ');
    });

    it('should handle special characters in environment variables', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065/path?query=value&other=123';
      process.env.MATTERMOST_TOKEN = 'token!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      process.env.MATTERMOST_CHANNEL = 'channel-with-special-chars_123!';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065/path?query=value&other=123');
      expect(config.get('MATTERMOST_TOKEN')).toBe('token!@#$%^&*()_+-={}[]|\\:";\'<>?,./');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('channel-with-special-chars_123!');
    });

    it('should handle unicode characters in environment variables', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://测试.example.com:8065';
      process.env.MATTERMOST_TOKEN = 'токен123';
      process.env.MATTERMOST_CHANNEL = 'канал-общения';
      
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://测试.example.com:8065');
      expect(config.get('MATTERMOST_TOKEN')).toBe('токен123');
      expect(config.get('MATTERMOST_CHANNEL')).toBe('канал-общения');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle multiple rapid configuration accesses', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        config.get('MATTERMOST_SERVER_URL');
        config.get('MATTERMOST_TOKEN');
        config.get('MATTERMOST_CHANNEL');
      }
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete 3000 operations in under 1 second
    });

    it('should maintain configuration consistency across multiple validations', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      for (let i = 0; i < 10; i++) {
        expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
        expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      }
    });

    it('should handle concurrent access patterns', async () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      const config = require('../../src/config/mattermostConfig').default;
      
      const promises = Array(50).fill(null).map(async () => {
        return {
          url: config.get('MATTERMOST_SERVER_URL'),
          token: config.get('MATTERMOST_TOKEN'),
          channel: config.get('MATTERMOST_CHANNEL')
        };
      });
      
      const results = await Promise.all(promises);
      
      // All results should be identical
      results.forEach(result => {
        expect(result.url).toBe('http://localhost:8065');
        expect(result.token).toBe('');
        expect(result.channel).toBe('');
      });
    });
  });

  describe('Integration and module behavior', () => {
    it('should maintain state after module re-import', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      
      const config1 = require('../../src/config/mattermostConfig').default;
      const config2 = require('../../src/config/mattermostConfig').default;
      
      expect(config1.get('MATTERMOST_SERVER_URL')).toBe(config2.get('MATTERMOST_SERVER_URL'));
      expect(config1).toBe(config2); // Should be the same instance
    });

    it('should work with destructured imports', () => {
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      
      const { default: config } = require('../../src/config/mattermostConfig');
      expect(config.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
    });

    it('should handle environment changes between imports', () => {
      // First import with one set of values
      process.env.MATTERMOST_SERVER_URL = 'http://localhost:8065';
      jest.resetModules();
      const config1 = require('../../src/config/mattermostConfig').default;
      expect(config1.get('MATTERMOST_SERVER_URL')).toBe('http://localhost:8065');
      
      // Change environment and re-import
      process.env.MATTERMOST_SERVER_URL = 'https://production.example.com';
      jest.resetModules();
      const config2 = require('../../src/config/mattermostConfig').default;
      expect(config2.get('MATTERMOST_SERVER_URL')).toBe('https://production.example.com');
    });
  });
});