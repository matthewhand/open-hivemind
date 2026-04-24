import { ConfigurationManager } from '@config/ConfigurationManager';
import { ValidationError } from '@src/types/errorClasses';
import convict from 'convict';

// Mock the schema for validation tests
const schema = convict({
  NODE_ENV: {
    doc: 'The application environment.',
    format: (val: any) => {
      if (!['production', 'development', 'test'].includes(val)) {
        throw new ValidationError('NODE_ENV must be one of: production, development, test');
      }
    },
    default: 'development',
  },
  VITE_API_BASE_URL: {
    doc: 'API base URL for Vite frontend',
    format: (val: any) => {
      if (typeof val !== 'string' || !val.startsWith('http')) {
        throw new ValidationError('VITE_API_BASE_URL must be a valid URL');
      }
    },
    default: 'http://localhost:3000/api',
  },
  PLAYWRIGHT_BASE_URL: {
    doc: 'Base URL for Playwright tests',
    format: (val: any) => {
      if (typeof val !== 'string' || !val.startsWith('http')) {
        throw new ValidationError('PLAYWRIGHT_BASE_URL must be a valid URL');
      }
    },
    default: 'http://localhost:3000',
  },
});

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = ConfigurationManager.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ConfigurationManager.getInstance();
      const instance2 = ConfigurationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfig', () => {
    it('should return the environment config', () => {
      const envConfig = configManager.getConfig('environment');
      expect(envConfig).not.toBeNull();
      expect(envConfig?.get('NODE_ENV')).toBeDefined();
    });

    it('should return null for non-existent configs', () => {
      const nonExistentConfig = configManager.getConfig('non-existent');
      expect(nonExistentConfig).toBeNull();
    });

    it('should throw for non-string config names', () => {
      expect(() => configManager.getConfig(123 as any)).toThrow(ValidationError);
    });
  });

  describe('Environment Validation', () => {
    it('should validate NODE_ENV', () => {
      const invalidConfig = { NODE_ENV: 'invalid' };
      schema.load(invalidConfig);
      expect(() => schema.validate()).toThrow();
      
      const validConfig = { NODE_ENV: 'production' };
      schema.load(validConfig);
      expect(() => schema.validate()).not.toThrow();
    });

    it('should validate VITE_API_BASE_URL', () => {
      const invalidNumberConfig = { VITE_API_BASE_URL: 123 };
      schema.load(invalidNumberConfig);
      expect(() => schema.validate()).toThrow();
      
      const invalidUrlConfig = { VITE_API_BASE_URL: 'invalid-url' };
      schema.load(invalidUrlConfig);
      expect(() => schema.validate()).toThrow();
      
      const validConfig = { VITE_API_BASE_URL: 'http://valid.url' };
      schema.load(validConfig);
      expect(() => schema.validate()).not.toThrow();
    });

    it('should validate PLAYWRIGHT_BASE_URL', () => {
      const invalidNumberConfig = { PLAYWRIGHT_BASE_URL: 123 };
      schema.load(invalidNumberConfig);
      expect(() => schema.validate()).toThrow();
      
      const invalidUrlConfig = { PLAYWRIGHT_BASE_URL: 'invalid-url' };
      schema.load(invalidUrlConfig);
      expect(() => schema.validate()).toThrow();
      
      const validConfig = { PLAYWRIGHT_BASE_URL: 'http://valid.url' };
      schema.load(validConfig);
      expect(() => schema.validate()).not.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should store and retrieve sessions', () => {
      configManager.setSession('discord', 'channel-123', 'session-456');
      const session = configManager.getSession('discord', 'channel-123');
      expect(session).toBe('discord-channel-123-session-456');
    });

    it('should return undefined for non-existent sessions', () => {
      const session = configManager.getSession('slack', 'channel-999');
      expect(session).toBeUndefined();
    });

    it('should throw for invalid session arguments', () => {
      expect(() => configManager.setSession(123 as any, 'channel-123', 'session-456')).toThrow(ValidationError);
      expect(() => configManager.setSession('discord', 123 as any, 'session-456')).toThrow(ValidationError);
      expect(() => configManager.setSession('discord', 'channel-123', 123 as any)).toThrow(ValidationError);
    });
  });
});