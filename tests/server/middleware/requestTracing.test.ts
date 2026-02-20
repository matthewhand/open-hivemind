/**
 * Tests for Request Tracing Middleware
 */

import { Request, Response, NextFunction } from 'express';
import {
  createRequestTracingMiddleware,
  requestTracing,
  errorTracing,
  getTraceId,
  getSpanId,
  getRequestLogger,
  getRequestDuration,
  TracedRequest,
  TracedResponse,
} from '@src/server/middleware/requestTracing';

// Mock StructuredLogger
jest.mock('@src/common/StructuredLogger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    withTraceId: jest.fn(function(this: any, traceId: string) {
      return { ...this, traceId };
    }),
  })),
}));

describe('Request Tracing Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      query: {},
      get: jest.fn((header: string) => mockRequest.headers?.[header.toLowerCase()] as string),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      get: jest.fn(),
      locals: {},
      end: jest.fn(),
      statusCode: 200,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequestTracingMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createRequestTracingMiddleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should use custom options', () => {
      const middleware = createRequestTracingMiddleware({
        serviceName: 'custom-service',
        generateSpanId: true,
        logRequests: true,
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('requestTracing middleware', () => {
    it('should add traceId to request', () => {
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const tracedReq = mockRequest as TracedRequest;
      expect(tracedReq.traceId).toBeDefined();
      expect(typeof tracedReq.traceId).toBe('string');
    });

    it('should add spanId to request when enabled', () => {
      const middleware = createRequestTracingMiddleware({ generateSpanId: true });
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const tracedReq = mockRequest as TracedRequest;
      expect(tracedReq.spanId).toBeDefined();
      expect(typeof tracedReq.spanId).toBe('string');
    });

    it('should add logger to request', () => {
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const tracedReq = mockRequest as TracedRequest;
      expect(tracedReq.logger).toBeDefined();
    });

    it('should add startTime to request', () => {
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const tracedReq = mockRequest as TracedRequest;
      expect(tracedReq.startTime).toBeDefined();
      expect(typeof tracedReq.startTime).toBe('number');
    });

    it('should use existing traceId from headers', () => {
      mockRequest.headers!['x-trace-id'] = 'existing-trace-123';
      
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const tracedReq = mockRequest as TracedRequest;
      expect(tracedReq.traceId).toBe('existing-trace-123');
    });

    it('should call next()', () => {
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should set trace header on response', () => {
      requestTracing(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Trace-Id',
        expect.any(String)
      );
    });
  });

  describe('getTraceId', () => {
    it('should return traceId from traced request', () => {
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.traceId = 'trace-456';
      
      const traceId = getTraceId(tracedReq);
      expect(traceId).toBe('trace-456');
    });

    it('should return undefined for regular request', () => {
      const traceId = getTraceId(mockRequest as Request);
      expect(traceId).toBeUndefined();
    });
  });

  describe('getSpanId', () => {
    it('should return spanId from traced request', () => {
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.spanId = 'span-789';
      
      const spanId = getSpanId(tracedReq);
      expect(spanId).toBe('span-789');
    });

    it('should return undefined for regular request', () => {
      const spanId = getSpanId(mockRequest as Request);
      expect(spanId).toBeUndefined();
    });
  });

  describe('getRequestLogger', () => {
    it('should return logger from traced request', () => {
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any;
      
      const logger = getRequestLogger(tracedReq);
      expect(logger).toBeDefined();
    });

    it('should return undefined for regular request', () => {
      const logger = getRequestLogger(mockRequest as Request);
      expect(logger).toBeUndefined();
    });
  });

  describe('getRequestDuration', () => {
    it('should return duration in milliseconds', () => {
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.startTime = Date.now() - 100; // 100ms ago
      
      const duration = getRequestDuration(tracedReq);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should return undefined if startTime not set', () => {
      const duration = getRequestDuration(mockRequest as Request);
      expect(duration).toBeUndefined();
    });
  });

  describe('errorTracing middleware', () => {
    it('should log error with trace context', () => {
      const error = new Error('Test error');
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.traceId = 'trace-error-123';
      tracedReq.startTime = Date.now();
      tracedReq.logger = {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      } as any;

      errorTracing(
        error,
        tracedReq as Request,
        mockResponse as Response,
        mockNext
      );

      expect(tracedReq.logger.error).toHaveBeenCalled();
    });

    it('should set error response with traceId', () => {
      const error = new Error('Test error');
      const tracedReq = mockRequest as TracedRequest;
      tracedReq.traceId = 'trace-error-456';
      tracedReq.startTime = Date.now();
      tracedReq.logger = {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      } as any;

      errorTracing(
        error,
        tracedReq as Request,
        mockResponse as Response,
        mockNext
      );

      // errorTracing passes error to next() for default Express error handling
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle HivemindError with proper status code', () => {
      // Create a mock HivemindError
      const hivemindError = new Error('Config missing') as any;
      hivemindError.code = 'CONFIG_MISSING';
      hivemindError.category = 'configuration';
      hivemindError.toJSON = () => ({
        code: 'CONFIG_MISSING',
        message: 'Config missing',
        category: 'configuration',
      });
      hivemindError.withTraceId = jest.fn();

      const tracedReq = mockRequest as TracedRequest;
      tracedReq.traceId = 'trace-config';
      tracedReq.startTime = Date.now();
      tracedReq.logger = {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      } as any;

      errorTracing(
        hivemindError,
        tracedReq as Request,
        mockResponse as Response,
        mockNext
      );

      // Should call withTraceId on HivemindError
      expect(hivemindError.withTraceId).toHaveBeenCalledWith('trace-config');
      expect(mockNext).toHaveBeenCalledWith(hivemindError);
    });
  });

  describe('TracedRequest interface', () => {
    it('should extend Express Request', () => {
      const tracedReq: TracedRequest = mockRequest as TracedRequest;
      tracedReq.traceId = 'test-trace';
      tracedReq.spanId = 'test-span';
      tracedReq.startTime = Date.now();
      tracedReq.logger = {} as any;

      expect(tracedReq.traceId).toBe('test-trace');
      expect(tracedReq.spanId).toBe('test-span');
      expect(tracedReq.startTime).toBeDefined();
      expect(tracedReq.logger).toBeDefined();
    });
  });

  describe('TracedResponse interface', () => {
    it('should extend Express Response', () => {
      const tracedRes: TracedResponse = mockResponse as TracedResponse;
      tracedRes.traceId = 'res-trace';

      expect(tracedRes.traceId).toBe('res-trace');
    });
  });
});
