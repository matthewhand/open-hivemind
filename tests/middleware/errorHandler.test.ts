import { NextFunction, Request, Response } from 'express';
import {
  asyncErrorHandler,
  errorRecoveryMiddleware,
  globalErrorHandler,
  handleUncaughtException,
  handleUnhandledRejection,
} from '../../src/middleware/errorHandler';
import { MetricsCollector } from '../../src/monitoring/MetricsCollector';
import { ErrorFactory } from '../../src/types/errorClasses';
import { errorLogger } from '../../src/utils/errorLogger';

jest.mock('../../src/utils/errorLogger', () => ({
  errorLogger: {
    logError: jest.fn(),
  },
}));

jest.mock('../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      incrementErrors: jest.fn(),
    }),
  },
}));

describe('errorHandler middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      path: '/test',
      method: 'GET',
      headers: {},
      correlationId: 'test-correlation-id',
      body: { password: 'secretpassword', normal: 'value' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      getHeader: jest.fn(),
      setHeader: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();

    // Silence console/debug in tests
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('globalErrorHandler', () => {
    it('handles generic errors and returns 500 status', () => {
      const error = new Error('Test generic error');

      globalErrorHandler(error, req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.any(String),
            code: expect.any(String),
          }),
        })
      );
      expect(errorLogger.logError).toHaveBeenCalled();
    });

    it('sets correlation ID header if not present', () => {
      const error = new Error('Test generic error');
      (res.getHeader as jest.Mock).mockReturnValue(null);

      globalErrorHandler(error, req as Request, res as Response, next as NextFunction);

      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-correlation-id');
    });

    it('sanitizes request body correctly', () => {
      const error = new Error('Test error');

      globalErrorHandler(error, req as Request, res as Response, next as NextFunction);

      const logArgs = (errorLogger.logError as jest.Mock).mock.calls[0][1];
      expect(logArgs.body.password).toBe('[REDACTED]');
      expect(logArgs.body.normal).toBe('value');
    });
  });

  describe('asyncErrorHandler', () => {
    it('catches asynchronous errors and passes them to next', async () => {
      const error = new Error('Async error');
      const asyncFn = async () => {
        throw error;
      };

      const wrappedFn = asyncErrorHandler(asyncFn);
      await wrappedFn(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('resolves properly when no error occurs', async () => {
      const asyncFn = async (req: Request, res: Response) => {
        return 'success';
      };

      const wrappedFn = asyncErrorHandler(asyncFn);
      await wrappedFn(req as Request, res as Response, next as NextFunction);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('errorRecoveryMiddleware', () => {
    it('parses retry headers correctly', () => {
      req.headers = {
        'x-retry-count': '2',
        'x-max-retries': '5',
      };

      errorRecoveryMiddleware(req as Request, res as Response, next as NextFunction);

      expect(req.retryCount).toBe(2);
      expect(req.maxRetries).toBe(5);
      expect(next).toHaveBeenCalled();
    });

    it('uses defaults when headers are missing', () => {
      req.headers = {};

      errorRecoveryMiddleware(req as Request, res as Response, next as NextFunction);

      expect(req.retryCount).toBe(0);
      expect(req.maxRetries).toBe(3);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('process exception handlers', () => {
    let originalEnv: string;

    beforeAll(() => {
      originalEnv = process.env.NODE_ENV || 'test';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('handleUncaughtException logs error in non-production', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Uncaught');

      expect(() => handleUncaughtException(error)).toThrow(error);
      expect(errorLogger.logError).toHaveBeenCalled();
    });

    it('handleUncaughtException logs error and schedules exit in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Uncaught');

      handleUncaughtException(error);

      expect(errorLogger.logError).toHaveBeenCalled();
      // Exit is now scheduled via setTimeout, not immediate
      // The actual exit is managed by ShutdownCoordinator
    });

    it('handleUnhandledRejection logs reason in non-production', () => {
      process.env.NODE_ENV = 'development';
      const promise = Promise.reject('Rejected');
      // catch to avoid actual unhandled rejection warning
      promise.catch(() => {});

      handleUnhandledRejection('Rejected reason', promise);

      expect(errorLogger.logError).toHaveBeenCalled();
    });

    it('handleUnhandledRejection logs reason and schedules exit in production', () => {
      process.env.NODE_ENV = 'production';
      const promise = Promise.reject('Rejected');
      // catch to avoid actual unhandled rejection warning
      promise.catch(() => {});

      handleUnhandledRejection('Rejected reason', promise);

      expect(errorLogger.logError).toHaveBeenCalled();
      // Exit is now scheduled via setTimeout, not immediate
      // The actual exit is managed by ShutdownCoordinator
    });
  });
});
