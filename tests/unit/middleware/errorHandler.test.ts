import { globalErrorHandler, asyncErrorHandler, rateLimitErrorHandler } from '../../../src/middleware/errorHandler';
import { BaseHivemindError, NetworkError, ConfigurationError } from '../../../src/types/errorClasses';
import { MetricsCollector } from '../../../src/monitoring/MetricsCollector';

// Mock MetricsCollector
jest.mock('../../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      incrementErrors: jest.fn(),
    }),
  },
}));

// Mock errorLogger
jest.mock('../../../src/utils/errorLogger', () => ({
  errorLogger: {
    logError: jest.fn(),
  },
}));

// Mock createErrorResponse
jest.mock('../../../src/utils/errorResponse', () => ({
  createErrorResponse: jest.fn((error: any, correlationId?: string) => ({
    withRequest: jest.fn().mockReturnValue({
      build: jest.fn().mockReturnValue({
        success: false,
        error: {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'Unknown error',
          type: 'internal',
          correlationId,
          timestamp: new Date().toISOString(),
        },
      }),
    }),
  })),
}));

describe('Error Handler Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      path: '/api/test',
      method: 'GET',
      headers: { 'user-agent': 'test-agent' },
      correlationId: 'corr-123',
      startTime: Date.now() - 100,
      body: { test: 'data' },
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('globalErrorHandler', () => {
    it('should handle BaseHivemindError', () => {
      const error = new BaseHivemindError('Test error', 'test_error');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Test error',
          }),
        })
      );
    });

    it('should handle NetworkError with correct status code', () => {
      const error = new NetworkError('Connection failed', { status: 502 });
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(502);
    });

    it('should handle ConfigurationError with 500 status', () => {
      const error = new ConfigurationError('Invalid config', 'key');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle plain Error objects', () => {
      const error = new Error('Plain error');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Plain error',
          }),
        })
      );
    });

    it('should handle string errors', () => {
      globalErrorHandler('String error' as any, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'String error',
          }),
        })
      );
    });

    it('should handle null errors', () => {
      globalErrorHandler(null as any, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should increment error metrics', () => {
      const error = new BaseHivemindError('Test', 'test');
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(MetricsCollector.getInstance().incrementErrors).toHaveBeenCalled();
    });

    it('should set correlation ID header when available', () => {
      const error = new BaseHivemindError('Test', 'test');
      mockRes.getHeader.mockReturnValue(undefined);
      globalErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'corr-123');
    });
  });

  describe('asyncErrorHandler', () => {
    it('should call next with error when async function rejects', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const handler = asyncErrorHandler(mockFn);

      handler(mockReq, mockRes, mockNext);

      // Wait for promise to resolve
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should not call next when async function resolves', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const handler = asyncErrorHandler(mockFn);

      handler(mockReq, mockRes, mockNext);

      await new Promise(resolve => setImmediate(resolve));

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('rateLimitErrorHandler', () => {
    it('should call next to pass to next handler', () => {
      rateLimitErrorHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
