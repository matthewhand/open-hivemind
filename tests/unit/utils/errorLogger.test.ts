import { ErrorLogger, type ErrorContext } from '../../../src/utils/errorLogger';
import { BaseHivemindError, NetworkError, ConfigurationError } from '../../../src/types/errorClasses';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    // Reset singleton
    (ErrorLogger as any).instance = undefined;
    logger = ErrorLogger.getInstance({
      enableConsole: false,
      enableFile: false,
      enableStructured: false,
      enableMetrics: false,
    });
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept custom configuration', () => {
      (ErrorLogger as any).instance = undefined;
      const customLogger = ErrorLogger.getInstance({ level: 'debug' });
      expect(customLogger).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log a NetworkError without throwing', () => {
      const error = new NetworkError('Connection failed', { status: 500 });
      const context: ErrorContext = {
        correlationId: 'corr-456',
        path: '/api/external',
        method: 'POST',
        duration: 5000,
      };

      expect(() => logger.logError(error, context)).not.toThrow();
    });

    it('should log a ConfigurationError without throwing', () => {
      const error = new ConfigurationError('Invalid config', 'key');
      const context: ErrorContext = {
        correlationId: 'corr-789',
        path: '/api/config',
        method: 'PUT',
        userId: 'user-1',
      };

      expect(() => logger.logError(error, context)).not.toThrow();
    });

    it('should handle plain error objects', () => {
      const error = { message: 'Plain error', code: 'PLAIN_ERROR' };
      const context: ErrorContext = {
        correlationId: 'corr-plain',
        path: '/api/test',
        method: 'GET',
      };

      expect(() => logger.logError(error as any, context)).not.toThrow();
    });

    it('should handle string errors', () => {
      const context: ErrorContext = {
        correlationId: 'corr-string',
        path: '/api/test',
        method: 'GET',
      };

      expect(() => logger.logError('String error' as any, context)).not.toThrow();
    });
  });

  describe('getErrorStats', () => {
    it('should return error stats', () => {
      const stats = logger.getErrorStats();
      expect(stats).toBeDefined();
    });
  });

  describe('clearStats', () => {
    it('should clear all error stats', () => {
      logger.clearStats();
      const stats = logger.getErrorStats();
      expect(stats).toBeDefined();
    });
  });
});
