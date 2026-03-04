import 'reflect-metadata';
import { container, Lifecycle } from 'tsyringe';
import {
  isRegistered,
  registerInstance,
  registerSingleton,
  registerTransient,
  resetContainer,
  resolve,
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

    it('delegates to tsyringe container.register with Singleton lifecycle', () => {
      const spy = jest.spyOn(container, 'register');
      registerSingleton('spy-singleton', DummyService);

      expect(spy).toHaveBeenCalledWith('spy-singleton', { useClass: DummyService }, { lifecycle: Lifecycle.Singleton });
      spy.mockRestore();
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

    it('delegates to tsyringe container.register without explicit lifecycle', () => {
      const spy = jest.spyOn(container, 'register');
      registerTransient('spy-transient', DummyService);

      expect(spy).toHaveBeenCalledWith('spy-transient', { useClass: DummyService });
      spy.mockRestore();
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
      }).toThrow('Attempted to resolve unregistered dependency token');
    });

    it('delegates resolution to the underlying tsyringe container', () => {
      const spy = jest.spyOn(container, 'resolve').mockReturnValue('spy-resolved');
      const result = resolve('spy-token');

      expect(spy).toHaveBeenCalledWith('spy-token');
      expect(result).toBe('spy-resolved');
      spy.mockRestore();
    });

    it('should delegate to container.resolve with the correct token', () => {
      const resolveSpy = jest.spyOn(container, 'resolve');

      // Register a dummy instance to avoid throwing
      registerInstance('delegate-token', 'test-value');

      const result = resolve('delegate-token');

      expect(resolveSpy).toHaveBeenCalledWith('delegate-token');
      expect(result).toBe('test-value');

      resolveSpy.mockRestore();
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
