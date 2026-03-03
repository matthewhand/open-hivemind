/**
 * Tests for ShutdownCoordinator
 * Verifies graceful shutdown orchestration across 5 phases
 */

import { Server as HttpServer } from 'http';
import { IShutdownable, ShutdownCoordinator } from '@src/server/ShutdownCoordinator';

// Mock HttpServer
const createMockHttpServer = (): jest.Mocked<HttpServer> => {
  return {
    close: jest.fn((callback?: () => void) => {
      // Simulate close callback if needed, but for hanging tests we override this
      if (callback) callback();
      return this;
    }),
    listening: true,
    address: jest.fn(() => ({ port: 3028 })),
  } as unknown as jest.Mocked<HttpServer>;
};

// Mock Vite server
const createMockViteServer = () => ({
  shutdown: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
});

// Mock messenger service
const createMockMessengerService = (name: string): IShutdownable => ({
  shutdown: jest.fn(() => Promise.resolve()),
  providerName: name,
});

// Mock generic service
const createMockService = (name: string): IShutdownable & { name: string } => ({
  shutdown: jest.fn(() => Promise.resolve()),
  name,
});

describe('ShutdownCoordinator', () => {
  let coordinator: ShutdownCoordinator;
  let exitProcessSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    // Reset singleton instance between tests
    (ShutdownCoordinator as any).instance = undefined;
    coordinator = ShutdownCoordinator.getInstance();
    jest.useFakeTimers();

    // Spy on protected method exitProcess
    exitProcessSpy = jest
      .spyOn(coordinator as any, 'exitProcess')
      .mockImplementation((code: number) => {
        console.log('MOCKED exitProcess called with', code);
      });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ShutdownCoordinator.getInstance();
      const instance2 = ShutdownCoordinator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Server Registration', () => {
    it('should register HTTP server', () => {
      const httpServer = createMockHttpServer();
      coordinator.registerHttpServer(httpServer);
      // Server should be registered without error
      expect(() => coordinator.registerHttpServer(httpServer)).not.toThrow();
    });

    it('should register Vite server', () => {
      const viteServer = createMockViteServer();
      coordinator.registerViteServer(viteServer);
      // Vite server should be registered without error
      expect(() => coordinator.registerViteServer(viteServer)).not.toThrow();
    });

    it('should register messenger service', () => {
      const service = createMockMessengerService('discord');
      coordinator.registerMessengerService(service);
      // Service should be registered without error
      expect(() => coordinator.registerMessengerService(service)).not.toThrow();
    });

    it('should register generic service', () => {
      const service = createMockService('test-service');
      coordinator.registerService(service);
      // Service should be registered without error
      expect(() => coordinator.registerService(service)).not.toThrow();
    });
  });

  describe('Phase Management', () => {
    it('should start in IDLE phase', () => {
      expect(coordinator.getCurrentPhase()).toBe(ShutdownPhase.IDLE);
    });

    it('should transition through phases during shutdown', async () => {
      const httpServer = createMockHttpServer();
      coordinator.registerHttpServer(httpServer);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');

      // Since execution is instantaneous with mocks, we just wait for completion
      await jest.runAllTimersAsync();
      await shutdownPromise;
      expect(coordinator.getCurrentPhase()).toBe(ShutdownPhase.COMPLETE);
    });
  });

  describe('Shutdown Execution', () => {
    it('should close HTTP server during shutdown', async () => {
      const httpServer = createMockHttpServer();
      coordinator.registerHttpServer(httpServer);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(httpServer.close).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(0);
    });

    it('should close Vite server during shutdown', async () => {
      const viteServer = createMockViteServer();
      coordinator.registerViteServer(viteServer);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(viteServer.shutdown).toHaveBeenCalled();
    });

    it('should call shutdown on messenger services', async () => {
      const service = createMockMessengerService('discord');
      coordinator.registerMessengerService(service);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(service.shutdown).toHaveBeenCalled();
    });

    it('should call shutdown on generic services', async () => {
      const service = createMockService('test-service');
      coordinator.registerService(service);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(service.shutdown).toHaveBeenCalled();
    });

    it('should handle services without shutdown method gracefully', async () => {
      const serviceWithoutShutdown = { name: 'no-shutdown' } as any;
      coordinator.registerService(serviceWithoutShutdown);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();

      // Should not throw
      await expect(shutdownPromise).resolves.not.toThrow();
    });

    it('should handle shutdown errors gracefully', async () => {
      const failingService: IShutdownable = {
        shutdown: jest.fn(() => Promise.reject(new Error('Shutdown failed'))),
      };
      coordinator.registerService(failingService);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();

      // Should not throw, error should be caught
      await expect(shutdownPromise).resolves.not.toThrow();
    });
  });

  describe('Signal Handlers', () => {
    it('should setup signal handlers', () => {
      // Mock process.on to prevent attaching real listeners that persist across tests
      const processOnSpy = jest.spyOn(process, 'on').mockImplementation(() => process);

      coordinator.setupSignalHandlers();

      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));

      processOnSpy.mockRestore();
    });

    it('should prevent multiple concurrent shutdowns', async () => {
      const httpServer = createMockHttpServer();
      coordinator.registerHttpServer(httpServer);

      // Start first shutdown
      const promise1 = coordinator.initiateShutdown('SIGTERM');

      // Try to start second shutdown while first is in progress
      const promise2 = coordinator.initiateShutdown('SIGINT');

      await jest.runAllTimersAsync();
      await Promise.all([promise1, promise2]);

      // HTTP server should only be closed once
      expect(httpServer.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timeout Handling', () => {
    it('should force exit after timeout', async () => {
      const httpServer = createMockHttpServer();
      httpServer.close.mockImplementation(() => {
        // Never call callback - simulate hanging
        return this;
      });
      coordinator.registerHttpServer(httpServer);

      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');

      // Advance past total timeout (1000ms) AND phase timeout (5000ms)
      // We need phase to timeout so shutdownPromise resolves (since process.exit is mocked)
      await jest.advanceTimersByTimeAsync(10000);

      await shutdownPromise;

      expect(exitProcessSpy).toHaveBeenCalled();
    });
  });

  describe('Shutdown Reason Tracking', () => {
    it('should track shutdown reason', async () => {
      const shutdownPromise = coordinator.initiateShutdown('SIGTERM');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(coordinator.getShutdownReason()).toBe('SIGTERM');
    });

    it('should track different shutdown reasons', async () => {
      const shutdownPromise = coordinator.initiateShutdown('unhandledRejection');
      await jest.runAllTimersAsync();
      await shutdownPromise;

      expect(coordinator.getShutdownReason()).toBe('unhandledRejection');
    });
  });
});
