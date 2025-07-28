import { ConfigurationManager } from '../../src/config/ConfigurationManager';
import Debug from 'debug';

interface DebugMock extends jest.Mock {
  enable: jest.Mock;
  disable: jest.Mock;
  log: jest.Mock;
  namespace: string;
}

let mockDebug: DebugMock;

beforeEach(() => {
  mockDebug = jest.fn(() => mockDebug) as unknown as DebugMock;
  mockDebug.enable = jest.fn();
  mockDebug.disable = jest.fn();
  mockDebug.log = jest.fn();
  mockDebug.namespace = 'app:ConfigurationManager';

  jest.mock('debug', () => {
    return {
      __esModule: true,
      default: Object.assign(
        (namespace: string) => {
          mockDebug.namespace = namespace;
          return mockDebug;
        },
        {
          enable: mockDebug.enable,
          disable: mockDebug.disable,
          log: mockDebug.log
        }
      )
    };
  });

  // Reset module registry and re-import ConfigurationManager
  jest.resetModules();
  const { ConfigurationManager } = require('../../src/config/ConfigurationManager');
});

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    mockDebug.mockClear();
    configManager = ConfigurationManager.getInstance();
  });

  afterEach(() => {
    // Clear singleton instance between tests
    (ConfigurationManager as any).instance = null;
  });

  describe('getInstance()', () => {
    it('should return a singleton instance', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with development environment by default', () => {
      expect(mockDebug).toHaveBeenCalledWith(
        'ConfigurationManager initialized in development environment'
      );
    });
  });

  describe('getConfig()', () => {
    it('should return null for non-existent config', () => {
      expect(configManager.getConfig('non_existent')).toBeNull();
      expect(mockDebug).toHaveBeenCalledWith(
        "Configuration 'non_existent' not found"
      );
    });

    it('should throw TypeError for invalid config name', () => {
      expect(() => configManager.getConfig(123 as any)).toThrow(TypeError);
    });
  });

  describe('session management', () => {
    const testIntegration = 'test-integration';
    const testChannel = 'test-channel';
    const testSession = 'test-session';

    beforeEach(() => {
      configManager.setSession(testIntegration, testChannel, testSession);
    });

    it('should store and retrieve sessions', () => {
      expect(configManager.getSession(testIntegration, testChannel)).toBe(
        `${testIntegration}-${testChannel}-${testSession}`
      );
      expect(mockDebug).toHaveBeenCalledWith(
        `Session set for integration ${testIntegration}, channel ${testChannel}, session ${testIntegration}-${testChannel}-${testSession}`
      );
    });

    it('should return undefined for unknown sessions', () => {
      expect(configManager.getSession('unknown', testChannel)).toBeUndefined();
    });

    it('should retrieve all sessions for an integration', () => {
      const sessions = configManager.getAllSessions(testIntegration);
      expect(sessions).toEqual({
        [testChannel]: `${testIntegration}-${testChannel}-${testSession}`
      });
    });

    it('should return undefined for unknown integration sessions', () => {
      expect(configManager.getAllSessions('unknown')).toBeUndefined();
    });

    it('should overwrite existing sessions', () => {
      const newSession = 'new-session';
      configManager.setSession(testIntegration, testChannel, newSession);
      expect(configManager.getSession(testIntegration, testChannel)).toBe(
        `${testIntegration}-${testChannel}-${newSession}`
      );
    });

    it('should throw TypeError for invalid session parameters', () => {
      expect(() => configManager.setSession(123 as any, testChannel, testSession)).toThrow(TypeError);
      expect(() => configManager.setSession(testIntegration, 123 as any, testSession)).toThrow(TypeError);
      expect(() => configManager.setSession(testIntegration, testChannel, 123 as any)).toThrow(TypeError);
    });
  });
});