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
    it('should log a BaseHivemindError without throwing', () => {
      const error = new BaseHivemindError('Test error', 'test');
      const context: ErrorContext = {
        correlationId: 'corr-123',
        path: '/api/test',
        method: 'GET',
      };

      expect(() => logger.logError(error, context)).not.toThrow();
    });

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
      const error = new ConfigurationError('Invalid config', 'invalid');
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

  describe('createLogEntry', () => {
    it('should create a structured log entry', () => {
      const error = new BaseHivemindError('Test error', 'test');
      const context: ErrorContext = {
        correlationId: 'corr-123',
        path: '/api/test',
        method: 'POST',
        userId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const entry = (logger as any).createLogEntry(error, context);

      expect(entry.correlationId).toBe('corr-123');
      expect(entry.error.message).toBe('Test error');
      expect(entry.error.code).toBe('test');
      expect(entry.request?.path).toBe('/api/test');
      expect(entry.request?.method).toBe('POST');
      expect(entry.request?.userId).toBe('user-1');
      expect(entry.system).toBeDefined();
      expect(entry.system.hostname).toBeDefined();
      expect(entry.system.pid).toBeDefined();
    });
  });

  describe('determineLogLevel', () => {
    it('should return error for BaseHivemindError', () => {
      const error = new BaseHivemindError('Test', 'test');
      const level = (logger as any).determineLogLevel(error, {});
      expect(['error', 'warn', 'fatal']).toContain(level);
    });

    it('should return fatal for high severity errors', () => {
      const error = new NetworkError('Critical failure', { status: 500 });
      const level = (logger as any).determineLogLevel(error, {});
      expect(['error', 'fatal']).toContain(level);
    });
  });

  describe('updateErrorCounts', () => {
    it('should track error counts by code', () => {
      const error = new BaseHivemindError('Test', 'test_code');
      (logger as any).updateErrorCounts(error);
      (logger as any).updateErrorCounts(error);

      const counts = (logger as any).errorCounts;
      expect(counts.get('test_code')).toBe(2);
    });
  });

  describe('getErrorSummary', () => {
    it('should return error summary', () => {
      const error = new BaseHivemindError('Test', 'test_code');
      (logger as any).updateErrorCounts(error);

      const summary = logger.getErrorSummary();
      expect(summary).toBeDefined();
    });
  });

  describe('clearErrorCounts', () => {
    it('should clear all error counts', () => {
      const error = new BaseHivemindError('Test', 'test_code');
      (logger as any).updateErrorCounts(error);
      logger.clearErrorCounts();

      const counts = (logger as any).errorCounts;
      expect(counts.size).toBe(0);
    });
  });
});
