import { ErrorHandler, PerformanceMonitor } from '@src/common/errors/ErrorHandler';
import 'jest';

describe('ErrorHandler', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('Error Handling', () => {
    it('should handle Error objects correctly', () => {
      const error = new Error('Test error');
      ErrorHandler.handle(error, 'test-context');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-context] Test error');
    });

    it('should handle string errors', () => {
      ErrorHandler.handle('String error', 'test-context');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-context] String error');
    });

    it('should handle unknown error types', () => {
      ErrorHandler.handle(null, 'test-context');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-context] null');
    });

    it('should handle different severity levels', () => {
      ErrorHandler.handle('Warning message', 'test-context', 'warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[test-context] Warning message');

      ErrorHandler.handle('Info message', 'test-context', 'info');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[test-context] Info message');
    });
  });

  describe('Async Error Handling', () => {
    it('should handle successful async operations', async () => {
      const result = await ErrorHandler.withErrorHandling(async () => 'success', 'test-context');

      expect(result).toBe('success');
    });

    it('should handle failed async operations with fallback', async () => {
      const result = await ErrorHandler.withErrorHandling(
        async () => {
          throw new Error('Async error');
        },
        'test-context',
        'fallback'
      );

      expect(result).toBe('fallback');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-context] Async error');
    });

    it('should handle failed async operations without fallback', async () => {
      const result = await ErrorHandler.withErrorHandling(async () => {
        throw new Error('No fallback error');
      }, 'test-context');

      expect(result).toBeNull();
    });
  });

  describe('Safe Wrapper', () => {
    it('should wrap successful functions', async () => {
      const wrapped = ErrorHandler.createSafeWrapper((x: number) => x * 2, 'test-wrapper');

      const result = await wrapped(5);
      expect(result).toBe(10);
    });

    it('should handle sync function errors', async () => {
      const wrapped = ErrorHandler.createSafeWrapper(() => {
        throw new Error('Sync error');
      }, 'test-wrapper');

      const result = await wrapped();
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-wrapper] Sync error');
    });

    it('should handle async function errors', async () => {
      const wrapped = ErrorHandler.createSafeWrapper(async () => {
        throw new Error('Async wrapper error');
      }, 'test-wrapper');

      const result = await wrapped();
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[test-wrapper] Async wrapper error');
    });
  });
});

describe('PerformanceMonitor', () => {
  describe('Timing Operations', () => {
    it('should track timing operations without errors', () => {
      // Test that the methods exist and don't throw
      expect(() => {
        PerformanceMonitor.startTiming('test-operation');
        PerformanceMonitor.endTiming('test-operation');
      }).not.toThrow();
    });

    it('should handle missing start time gracefully', () => {
      // Test that ending a non-existent timer doesn't crash
      expect(() => {
        PerformanceMonitor.endTiming('non-existent-operation');
      }).not.toThrow();
    });

    it('should support timing with thresholds', () => {
      expect(() => {
        PerformanceMonitor.startTiming('threshold-test');
        PerformanceMonitor.endTiming('threshold-test', 1000); // 1 second threshold
      }).not.toThrow();
    });
  });

  describe('Async Performance Monitoring', () => {
    it('should measure async operations successfully', async () => {
      const result = await PerformanceMonitor.measureAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'async result';
      }, 'async-test');

      expect(result).toBe('async result');
    });

    it('should handle async errors', async () => {
      await expect(
        PerformanceMonitor.measureAsync(async () => {
          throw new Error('Async performance error');
        }, 'failing-async')
      ).rejects.toThrow('Async performance error');
    });
  });
});
