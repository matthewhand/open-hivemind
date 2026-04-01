import { NextFunction, Request, Response } from 'express';
import {
  asyncErrorHandler,
  correlationMiddleware,
  errorRecoveryMiddleware,
  globalErrorHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  rateLimitErrorHandler,
  setupGlobalErrorHandlers,
  setupGracefulShutdown,
} from '../../../src/middleware/errorHandler';
import { MetricsCollector } from '../../../src/monitoring/MetricsCollector';
import { BaseHivemindError, ErrorFactory } from '../../../src/types/errorClasses';
import { errorLogger } from '../../../src/utils/errorLogger';

jest.mock('../../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      incrementErrors: jest.fn(),
    }),
  },
}));

jest.mock('../../../src/utils/errorLogger', () => ({
  errorLogger: {
    logError: jest.fn(),
  },
}));

jest.mock('../../../src/types/errorClasses', () => {
  const mockHivemindError = {
    name: 'MockError',
    code: 'MOCK_ERROR',
    message: 'Mock error message',
    statusCode: 500,
    details: { foo: 'bar' },
    getRecoveryStrategy: jest.fn().mockReturnValue({
      canRecover: false,
      recoverySteps: ['Step 1'],
    }),
    toJSON: jest.fn().mockReturnValue({ error: 'serialized' }),
  };

  return {
    ErrorFactory: {
      createError: jest.fn().mockReturnValue(mockHivemindError),
    },
    BaseHivemindError: class {},
  };
});

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    (MetricsCollector as any).instance = undefined;
    mockReq = {
      method: 'GET',
      path: '/test',
      headers: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' } as any,
    };
    mockRes = {
      setHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue(null),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('correlationMiddleware', () => {
    it('should generate a correlation ID if none exists', () => {
      correlationMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.correlationId).toMatch(/^corr_\d+_[a-f0-9]+$/);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', mockReq.correlationId);
      expect(typeof mockReq.startTime).toBe('number');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use x-correlation-id from headers if present', () => {
      mockReq.headers = { 'x-correlation-id': 'existing-corr-id' };
      correlationMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.correlationId).toBe('existing-corr-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-corr-id');
    });

    it('should use x-request-id from headers if present and x-correlation-id is missing', () => {
      mockReq.headers = { 'x-request-id': 'existing-req-id' };
      correlationMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.correlationId).toBe('existing-req-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-req-id');
    });
  });

  describe('globalErrorHandler', () => {
    it('should handle standard errors, log them, and respond correctly', () => {
      mockReq.correlationId = 'test-corr-id';
      mockReq.startTime = Date.now() - 100;
      mockReq.body = { password: 'secretpassword', normalField: 'value' };

      const error = new Error('Test error');

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      globalErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(ErrorFactory.createError).toHaveBeenCalledWith(error, expect.any(Object));
      expect(errorLogger.logError).toHaveBeenCalled();
      expect(MetricsCollector.getInstance().incrementErrors).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MOCK_ERROR',
            message: 'Mock error message',
            correlationId: 'test-corr-id',
            details: { foo: 'bar' },
          }),
          request: expect.objectContaining({
            path: '/test',
            method: 'GET',
            correlationId: 'test-corr-id',
          }),
        })
      );

      // Ensure response doesn't contain stack in production
      const jsonCallArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCallArg.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Update mock to return a stack
      const mockErrorWithStack = {
        name: 'MockError',
        code: 'MOCK_ERROR',
        message: 'Mock error message',
        statusCode: 500,
        stack: 'Error: Mock error message\\n    at ...',
        getRecoveryStrategy: jest.fn().mockReturnValue(undefined),
        toJSON: jest.fn().mockReturnValue({}),
      };
      (ErrorFactory.createError as jest.Mock).mockReturnValueOnce(mockErrorWithStack);

      globalErrorHandler(new Error('test'), mockReq as Request, mockRes as Response, mockNext);

      const jsonCallArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(typeof jsonCallArg.stack).toBe('string');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncErrorHandler', () => {
    it('should resolve a successful promise and not call next with error', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const handler = asyncErrorHandler(mockFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch a rejected promise and pass error to next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const handler = asyncErrorHandler(mockFn);

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('handleUncaughtException', () => {
    const originalEnv = process.env.NODE_ENV;
    let mockExit: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    });

    afterEach(() => {
      jest.useRealTimers();
      (MetricsCollector as any).instance = undefined;
      process.env.NODE_ENV = originalEnv;
      mockExit.mockRestore();
    });

    it('should log error, increment metrics, and exit in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Uncaught');

      handleUncaughtException(error);

      expect(errorLogger.logError).toHaveBeenCalled();
      expect(MetricsCollector.getInstance().incrementErrors).toHaveBeenCalled();
      // The handler now defers exit via setTimeout(5000)
      jest.advanceTimersByTime(5000);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should rethrow error in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Uncaught');

      expect(() => handleUncaughtException(error)).toThrow('Uncaught');
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('handleUnhandledRejection', () => {
    const originalEnv = process.env.NODE_ENV;
    let mockExit: jest.SpyInstance;

    beforeEach(() => {
      jest.useFakeTimers();
      mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    });

    afterEach(() => {
      jest.useRealTimers();
      (MetricsCollector as any).instance = undefined;
      process.env.NODE_ENV = originalEnv;
      mockExit.mockRestore();
    });

    it('should log error, increment metrics, and exit in production', () => {
      process.env.NODE_ENV = 'production';
      const reason = 'Promise rejected';
      const promise = Promise.reject(reason);

      // Catch unhandled rejection for the test itself to prevent it failing
      promise.catch(() => {});

      handleUnhandledRejection(reason, promise);

      expect(errorLogger.logError).toHaveBeenCalled();
      expect(MetricsCollector.getInstance().incrementErrors).toHaveBeenCalled();
      // The handler now defers exit via setTimeout(5000)
      jest.advanceTimersByTime(5000);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should log but not exit in development', () => {
      process.env.NODE_ENV = 'development';
      const reason = 'Promise rejected';
      const promise = Promise.reject(reason);

      promise.catch(() => {});

      handleUnhandledRejection(reason, promise);

      expect(errorLogger.logError).toHaveBeenCalled();
      // Logging is now via structured Debug logger, not console.error
      expect(mockExit).not.toHaveBeenCalled();
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    it('should not throw (now delegated to ShutdownCoordinator)', () => {
      expect(() => setupGlobalErrorHandlers()).not.toThrow();
    });
  });

  describe('setupGracefulShutdown', () => {
    it('should not throw (now delegated to ShutdownCoordinator)', () => {
      expect(() => setupGracefulShutdown()).not.toThrow();
    });
  });

  describe('errorRecoveryMiddleware', () => {
    it('should parse retry headers and attach them to the request', () => {
      mockReq.headers = {
        'x-retry-count': '2',
        'x-max-retries': '5',
      };

      errorRecoveryMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).retryCount).toBe(2);
      expect((mockReq as any).maxRetries).toBe(5);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default values if headers are missing', () => {
      mockReq.headers = {};

      errorRecoveryMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).retryCount).toBe(0);
      expect((mockReq as any).maxRetries).toBe(3);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rateLimitErrorHandler', () => {
    /**
     * Currently a stub test since rateLimitErrorHandler is a passthrough stub.
     * This test ensures it doesn't break when passing through to next().
     */
    it('should call next', () => {
      rateLimitErrorHandler(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
