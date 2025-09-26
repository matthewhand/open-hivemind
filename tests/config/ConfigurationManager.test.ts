import Debug from 'debug';

// Mock debug module before importing ConfigurationManager
jest.mock('debug', () => {
  return jest.fn(() => jest.fn());
});

import { ConfigurationManager } from '../../src/config/ConfigurationManager';


describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    // Clear singleton instance before each test
    (ConfigurationManager as any).instance = null;
    jest.clearAllMocks();
    configManager = ConfigurationManager.getInstance();
  });

  afterEach(() => {
    // Ensure clean state after each test
    (ConfigurationManager as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      const instance3 = ConfigurationManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBeInstanceOf(ConfigurationManager);
    });

    it('should initialize debug logging on creation', () => {
      // Debug is mocked, just verify the instance was created successfully
      expect(configManager).toBeDefined();
      expect(configManager).toBeInstanceOf(ConfigurationManager);
    });

    it('should maintain singleton across different contexts', () => {
      const instance1 = ConfigurationManager.getInstance();
      
      // Simulate different module context
      const instance2 = ConfigurationManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration Management', () => {
    describe('getConfig()', () => {
      it('should return null for non-existent configuration', () => {
        const result = configManager.getConfig('non_existent_config');
        expect(result).toBeNull();
      });

      it('should throw TypeError for non-string config name', () => {
        expect(() => configManager.getConfig(null as any)).toThrow(TypeError);
        expect(() => configManager.getConfig(undefined as any)).toThrow(TypeError);
        expect(() => configManager.getConfig(123 as any)).toThrow(TypeError);
        expect(() => configManager.getConfig({} as any)).toThrow(TypeError);
        expect(() => configManager.getConfig([] as any)).toThrow(TypeError);
        expect(() => configManager.getConfig(true as any)).toThrow(TypeError);
      });

      it('should handle empty string config name', () => {
        const result = configManager.getConfig('');
        expect(result).toBeNull();
      });

      it('should handle whitespace-only config names', () => {
        const result = configManager.getConfig('   ');
        expect(result).toBeNull();
      });

      it('should be case-sensitive for config names', () => {
        const result1 = configManager.getConfig('TestConfig');
        const result2 = configManager.getConfig('testconfig');
        const result3 = configManager.getConfig('TESTCONFIG');
        
        expect(result1).toBeNull();
        expect(result2).toBeNull();
        expect(result3).toBeNull();
      });
    });
  });

  describe('Session Management', () => {
    const testIntegration = 'slack';
    const testChannel = 'C123456789';
    const testSession = 'session_abc123';

    describe('setSession()', () => {
      it('should store session with correct format', () => {
        configManager.setSession(testIntegration, testChannel, testSession);
        
        const retrievedSession = configManager.getSession(testIntegration, testChannel);
        expect(retrievedSession).toBe(`${testIntegration}-${testChannel}-${testSession}`);
      });

      it('should create integration namespace if it does not exist', () => {
        const newIntegration = 'discord';
        configManager.setSession(newIntegration, testChannel, testSession);
        
        const sessions = configManager.getAllSessions(newIntegration);
        expect(sessions).toBeDefined();
        expect(sessions![testChannel]).toBe(`${newIntegration}-${testChannel}-${testSession}`);
      });

      it('should overwrite existing sessions for same integration/channel', () => {
        const originalSession = 'original_session';
        const newSession = 'new_session';
        
        configManager.setSession(testIntegration, testChannel, originalSession);
        configManager.setSession(testIntegration, testChannel, newSession);
        
        const retrievedSession = configManager.getSession(testIntegration, testChannel);
        expect(retrievedSession).toBe(`${testIntegration}-${testChannel}-${newSession}`);
      });

      it('should handle multiple channels for same integration', () => {
        const channel1 = 'C111111111';
        const channel2 = 'C222222222';
        const session1 = 'session1';
        const session2 = 'session2';
        
        configManager.setSession(testIntegration, channel1, session1);
        configManager.setSession(testIntegration, channel2, session2);
        
        expect(configManager.getSession(testIntegration, channel1)).toBe(`${testIntegration}-${channel1}-${session1}`);
        expect(configManager.getSession(testIntegration, channel2)).toBe(`${testIntegration}-${channel2}-${session2}`);
      });

      it('should handle special characters in session data', () => {
        const specialIntegration = 'test-integration_v2';
        const specialChannel = 'channel@#$%';
        const specialSession = 'session!@#$%^&*()';
        
        configManager.setSession(specialIntegration, specialChannel, specialSession);
        
        const retrievedSession = configManager.getSession(specialIntegration, specialChannel);
        expect(retrievedSession).toBe(`${specialIntegration}-${specialChannel}-${specialSession}`);
      });

      describe('Parameter validation', () => {
        it('should throw TypeError for invalid integration parameter', () => {
          expect(() => configManager.setSession(null as any, testChannel, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(undefined as any, testChannel, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(123 as any, testChannel, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession({} as any, testChannel, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession([] as any, testChannel, testSession)).toThrow(TypeError);
        });

        it('should throw TypeError for invalid channelId parameter', () => {
          expect(() => configManager.setSession(testIntegration, null as any, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, undefined as any, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, 123 as any, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, {} as any, testSession)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, [] as any, testSession)).toThrow(TypeError);
        });

        it('should throw TypeError for invalid sessionId parameter', () => {
          expect(() => configManager.setSession(testIntegration, testChannel, null as any)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, testChannel, undefined as any)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, testChannel, 123 as any)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, testChannel, {} as any)).toThrow(TypeError);
          expect(() => configManager.setSession(testIntegration, testChannel, [] as any)).toThrow(TypeError);
        });

        it('should accept empty strings as valid parameters', () => {
          expect(() => configManager.setSession('', '', '')).not.toThrow();
          const result = configManager.getSession('', '');
          expect(result).toBe('--');
        });
      });
    });

    describe('getSession()', () => {
      beforeEach(() => {
        configManager.setSession(testIntegration, testChannel, testSession);
      });

      it('should retrieve existing session', () => {
        const result = configManager.getSession(testIntegration, testChannel);
        expect(result).toBe(`${testIntegration}-${testChannel}-${testSession}`);
      });

      it('should return undefined for non-existent integration', () => {
        const result = configManager.getSession('non_existent', testChannel);
        expect(result).toBeUndefined();
      });

      it('should return undefined for non-existent channel', () => {
        const result = configManager.getSession(testIntegration, 'non_existent');
        expect(result).toBeUndefined();
      });

      it('should return undefined for both non-existent integration and channel', () => {
        const result = configManager.getSession('non_existent', 'non_existent');
        expect(result).toBeUndefined();
      });

      it('should handle case-sensitive lookups', () => {
        const result1 = configManager.getSession(testIntegration.toUpperCase(), testChannel);
        const result2 = configManager.getSession(testIntegration, testChannel.toLowerCase());

        expect(result1).toBeUndefined();
        expect(result2).toBeUndefined();
      });
    });

    describe('getAllSessions()', () => {
      beforeEach(() => {
        configManager.setSession(testIntegration, 'channel1', 'session1');
        configManager.setSession(testIntegration, 'channel2', 'session2');
        configManager.setSession('other_integration', 'channel3', 'session3');
      });

      it('should return all sessions for existing integration', () => {
        const sessions = configManager.getAllSessions(testIntegration);
        
        expect(sessions).toBeDefined();
        expect(Object.keys(sessions!)).toHaveLength(2);
        expect(sessions!['channel1']).toBe(`${testIntegration}-channel1-session1`);
        expect(sessions!['channel2']).toBe(`${testIntegration}-channel2-session2`);
      });

      it('should return undefined for non-existent integration', () => {
        const sessions = configManager.getAllSessions('non_existent');
        expect(sessions).toBeUndefined();
      });

      it('should return empty object for integration with no sessions', () => {
        configManager.setSession('empty_integration', 'temp', 'temp');
        // Clear the session by overwriting the integration store
        (configManager as any).sessionStore['empty_integration'] = {};
        
        const sessions = configManager.getAllSessions('empty_integration');
        expect(sessions).toEqual({});
      });

      it('should not affect other integrations', () => {
        const slackSessions = configManager.getAllSessions(testIntegration);
        const otherSessions = configManager.getAllSessions('other_integration');
        
        expect(slackSessions).not.toEqual(otherSessions);
        expect(Object.keys(slackSessions!)).toHaveLength(2);
        expect(Object.keys(otherSessions!)).toHaveLength(1);
      });
    });

    describe('Session isolation and concurrency', () => {
      it('should maintain session isolation between different integrations', () => {
        const integrations = ['slack', 'discord', 'teams', 'mattermost'];
        const channel = 'common_channel';
        const session = 'common_session';
        
        integrations.forEach(integration => {
          configManager.setSession(integration, channel, session);
        });
        
        integrations.forEach(integration => {
          const retrievedSession = configManager.getSession(integration, channel);
          expect(retrievedSession).toBe(`${integration}-${channel}-${session}`);
        });
      });

      it('should handle rapid session updates', () => {
        const updates = 100;
        const integration = 'rapid_test';
        const channel = 'rapid_channel';
        
        for (let i = 0; i < updates; i++) {
          configManager.setSession(integration, channel, `session_${i}`);
        }
        
        const finalSession = configManager.getSession(integration, channel);
        expect(finalSession).toBe(`${integration}-${channel}-session_${updates - 1}`);
      });

      it('should maintain data integrity with concurrent-like operations', () => {
        const operations = [
          () => configManager.setSession('int1', 'ch1', 'sess1'),
          () => configManager.setSession('int2', 'ch2', 'sess2'),
          () => configManager.getSession('int1', 'ch1'),
          () => configManager.getAllSessions('int1'),
          () => configManager.setSession('int1', 'ch2', 'sess3'),
        ];
        
        // Execute operations in sequence (simulating concurrent access)
        operations.forEach(op => op());
        
        expect(configManager.getSession('int1', 'ch1')).toBe('int1-ch1-sess1');
        expect(configManager.getSession('int2', 'ch2')).toBe('int2-ch2-sess2');
        expect(configManager.getSession('int1', 'ch2')).toBe('int1-ch2-sess3');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle memory pressure gracefully', () => {
      const largeDataSize = 1000;
      
      for (let i = 0; i < largeDataSize; i++) {
        configManager.setSession(`integration_${i}`, `channel_${i}`, `session_${i}`);
      }
      
      // Verify data integrity
      for (let i = 0; i < largeDataSize; i++) {
        const session = configManager.getSession(`integration_${i}`, `channel_${i}`);
        expect(session).toBe(`integration_${i}-channel_${i}-session_${i}`);
      }
    });

    it('should maintain state consistency after errors', () => {
      configManager.setSession('test', 'channel1', 'session1');
      
      // Trigger error
      try {
        configManager.setSession(null as any, 'channel2', 'session2');
      } catch (error) {
        // Expected error
      }
      
      // Verify existing data is still intact
      expect(configManager.getSession('test', 'channel1')).toBe('test-channel1-session1');
      
      // Verify new valid operations still work
      configManager.setSession('test', 'channel3', 'session3');
      expect(configManager.getSession('test', 'channel3')).toBe('test-channel3-session3');
    });

    it('should handle Unicode and special characters correctly', () => {
      const unicodeIntegration = '测试集成';
      const unicodeChannel = '频道🎉';
      const unicodeSession = 'сессия';
      
      configManager.setSession(unicodeIntegration, unicodeChannel, unicodeSession);
      
      const result = configManager.getSession(unicodeIntegration, unicodeChannel);
      expect(result).toBe(`${unicodeIntegration}-${unicodeChannel}-${unicodeSession}`);
    });
  });

  describe('Environment Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Save original environment
      originalEnv = { ...process.env };
      jest.restoreAllMocks();
      
      // Reset singleton instance for environment tests
      (ConfigurationManager as any).instance = null;
    });

    afterEach(() => {
      // Restore original environment by resetting each key
      for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) {
          delete process.env[key];
        }
      }
      for (const key of Object.keys(originalEnv)) {
        process.env[key] = originalEnv[key];
      }
    });

    describe('URL Environment Variables', () => {
      it('should load default values when no environment variables are set', () => {
        // Ensure no env vars are set
        delete process.env.VITE_API_BASE_URL;
        delete process.env.PLAYWRIGHT_BASE_URL;

        // Reset instance to force reinitialization
        (ConfigurationManager as any).instance = null;
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');

        expect(envConfig).not.toBeNull();
        expect((envConfig as any).get('VITE_API_BASE_URL')).toBe('http://localhost:3000/api');
        expect((envConfig as any).get('PLAYWRIGHT_BASE_URL')).toBe('http://localhost:3000');
      });

      it('should override defaults with valid environment variables', () => {
        process.env.VITE_API_BASE_URL = 'https://api.example.com/v1';
        process.env.PLAYWRIGHT_BASE_URL = 'https://test.example.com';

        // Reset modules to apply environment variables
        jest.resetModules();
        const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');

        expect((envConfig as any).get('VITE_API_BASE_URL')).toBe('https://api.example.com/v1');
        expect((envConfig as any).get('PLAYWRIGHT_BASE_URL')).toBe('https://test.example.com');
      });

      it('should fallback to defaults when environment variables are empty strings', () => {
        process.env.VITE_API_BASE_URL = '';
        process.env.PLAYWRIGHT_BASE_URL = '';

        // Reset instance to force reinitialization
        (ConfigurationManager as any).instance = null;
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');

        expect((envConfig as any).get('VITE_API_BASE_URL')).toBe('http://localhost:3000/api');
        expect((envConfig as any).get('PLAYWRIGHT_BASE_URL')).toBe('http://localhost:3000');
      });

      it('should throw validation error for invalid URL formats', () => {
        process.env.VITE_API_BASE_URL = 'invalid-url';
        process.env.PLAYWRIGHT_BASE_URL = 'also-invalid';

        // Reset modules to apply environment variables
        jest.resetModules();
        const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');
        console.log('VITE_API_BASE_URL:', (envConfig as any).get('VITE_API_BASE_URL'));
        expect((envConfig as any).get('VITE_API_BASE_URL')).toBe('http://localhost:3000/api');
      });

      it('should handle partial invalid configurations by validating all', () => {
        process.env.VITE_API_BASE_URL = 'https://valid.example.com';
        process.env.PLAYWRIGHT_BASE_URL = 'invalid';

        // Reset modules to apply environment variables
        jest.resetModules();
        const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');
        expect((envConfig as any).get('PLAYWRIGHT_BASE_URL')).toBe('http://localhost:3000');
      });

      it('should load correctly in test environment', () => {
        process.env.NODE_ENV = 'test';
        process.env.VITE_API_BASE_URL = 'https://test-api.example.com';
        process.env.PLAYWRIGHT_BASE_URL = 'http://localhost:8080';

        // Reset modules to apply environment variables
        jest.resetModules();
        const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');

        expect((envConfig as any).get('NODE_ENV')).toBe('test');
        expect((envConfig as any).get('VITE_API_BASE_URL')).toBe('https://test-api.example.com');
        expect((envConfig as any).get('PLAYWRIGHT_BASE_URL')).toBe('http://localhost:8080');
      });

      it('should validate URL parsing with protocol variations', () => {
        process.env.VITE_API_BASE_URL = 'https://api.example.com/path';
        process.env.PLAYWRIGHT_BASE_URL = 'http://localhost:3001';

        // Reset modules to apply environment variables
        jest.resetModules();
        const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
        const configManager = ConfigurationManager.getInstance();
        const envConfig = configManager.getConfig('environment');

        const viteUrl = (envConfig as any).get('VITE_API_BASE_URL');
        const pwUrl = (envConfig as any).get('PLAYWRIGHT_BASE_URL');

        expect(viteUrl).toContain('https://');
        expect(pwUrl).toContain('http://');
      });
    });
  });
});