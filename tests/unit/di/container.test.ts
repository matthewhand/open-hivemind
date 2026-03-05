import 'reflect-metadata';
import { container } from 'tsyringe';
import {
  resetContainer,
  registerSingleton,
  registerTransient,
  registerInstance,
  resolve,
  isRegistered,
} from '../../../src/di/container';

describe('DI Container', () => {
  // A dummy class to use for registration
  /**
   * Dummy service class used for testing dependency injection types and resolution.
   */
  class DummyService {
    getValue() {
      return 'dummy';
    }
  }

  afterEach(() => {
    // Ensure we don't leak state between tests
    container.reset();
  });

  describe('resetContainer', () => {
    it('should clear all registered services', () => {
      // Register a service using container directly
      container.registerInstance('test-token', { test: true });
      expect(container.isRegistered('test-token')).toBe(true);

      // Call resetContainer
      resetContainer();

      // Verify container was reset
      expect(container.isRegistered('test-token')).toBe(false);
    });
  });

  describe('registerSingleton', () => {
    it('should register a class as a singleton', () => {
      registerSingleton('singleton-token', DummyService);

      expect(isRegistered('singleton-token')).toBe(true);

      const instance1 = resolve<DummyService>('singleton-token');
      const instance2 = resolve<DummyService>('singleton-token');

      // Both instances should be the exact same object (singleton)
      expect(instance1).toBeInstanceOf(DummyService);
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerTransient', () => {
    it('should register a class as transient (new instance each time)', () => {
      registerTransient('transient-token', DummyService);

      expect(isRegistered('transient-token')).toBe(true);

      const instance1 = resolve<DummyService>('transient-token');
      const instance2 = resolve<DummyService>('transient-token');

      // Both instances should be valid but different objects
      expect(instance1).toBeInstanceOf(DummyService);
      expect(instance2).toBeInstanceOf(DummyService);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('registerInstance', () => {
    it('should register a specific instance', () => {
      const myInstance = { custom: 'value' };
      registerInstance('instance-token', myInstance);

      expect(isRegistered('instance-token')).toBe(true);

      const resolved = resolve<typeof myInstance>('instance-token');
      expect(resolved).toBe(myInstance);
    });
  });

  describe('resolve', () => {
    it('should resolve a registered service', () => {
      registerInstance('resolve-token', 'resolved-value');

      const result = resolve<string>('resolve-token');
      expect(result).toBe('resolved-value');
    });

    it('should throw when resolving an unregistered service', () => {
      expect(() => {
        resolve('unregistered-token');
      }).toThrow();
    });
  });

  describe('isRegistered', () => {
    it('should return true if a token is registered', () => {
      registerInstance('check-token', 'value');
      expect(isRegistered('check-token')).toBe(true);
    });

    it('should return false if a token is not registered', () => {
      expect(isRegistered('non-existent-token')).toBe(false);
    });
  });
});
