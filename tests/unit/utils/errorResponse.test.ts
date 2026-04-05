import { ErrorResponseBuilder, SuccessResponseBuilder, createErrorResponse, sendErrorResponse, sendSuccessResponse } from '../../../src/utils/errorResponse';
import { NetworkError, ConfigurationError } from '../../../src/types/errorClasses';

describe('ErrorResponseBuilder', () => {
  describe('basic error response', () => {
    it('should create error response from plain object', () => {
      const error = { code: 'CUSTOM_ERROR', message: 'Custom error' };
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('CUSTOM_ERROR');
      expect(response.error.message).toBe('Custom error');
      expect(response.error.timestamp).toBeDefined();
    });

    it('should include correlation ID when provided', () => {
      const error = new NetworkError('Network failed', { status: 500 });
      const builder = new ErrorResponseBuilder(error, 'corr-123');
      const response = builder.build();

      expect(response.error.correlationId).toBe('corr-123');
    });

    it('should include error details when available', () => {
      const error = new NetworkError('Network failed', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.details).toBeDefined();
    });
  });

  describe('withRequest', () => {
    it('should add request information', () => {
      const error = new NetworkError('Not found', { status: 404 });
      const builder = new ErrorResponseBuilder(error);
      builder.withRequest('/api/test', 'GET', 'corr-456');
      const response = builder.build();

      expect(response.request).toEqual({
        path: '/api/test',
        method: 'GET',
        correlationId: 'corr-456',
      });
    });
  });

  describe('withDetails', () => {
    it('should merge additional details', () => {
      const error = { code: 'TEST_ERROR', message: 'Test' };
      const builder = new ErrorResponseBuilder(error);
      builder.withDetails({ field: 'email', reason: 'invalid' });
      const response = builder.build();

      expect(response.error.details).toEqual({
        field: 'email',
        reason: 'invalid',
      });
    });
  });

  describe('withMessage', () => {
    it('should override error message', () => {
      const error = new NetworkError('Original message', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      builder.withMessage('Sanitized message');
      const response = builder.build();

      expect(response.error.message).toBe('Sanitized message');
    });
  });

  describe('getStatusCode', () => {
    it('should return 400 for VALIDATION_ERROR', () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Invalid' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(400);
    });

    it('should return 401 for AUTH_ERROR', () => {
      const error = { code: 'AUTH_ERROR', message: 'Unauthorized' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(401);
    });

    it('should return 403 for AUTHZ_ERROR', () => {
      const error = { code: 'AUTHZ_ERROR', message: 'Forbidden' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(403);
    });

    it('should return 404 for NOT_FOUND', () => {
      const error = { code: 'NOT_FOUND', message: 'Not found' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(404);
    });

    it('should return 429 for RATE_LIMIT_ERROR', () => {
      const error = { code: 'RATE_LIMIT_ERROR', message: 'Too many requests' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(429);
    });

    it('should return 500 for unknown errors', () => {
      const error = { code: 'UNKNOWN_ERROR', message: 'Unknown' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(500);
    });
  });

  describe('sendErrorResponse', () => {
    it('should send error response via Express response', () => {
      const error = new NetworkError('Test error', { status: 500 });
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
        getHeader: jest.fn().mockReturnValue(undefined),
      } as any;

      sendErrorResponse(mockRes, error, 'corr-123', { path: '/api/test', method: 'POST' });

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Test error',
        }),
      }));
    });
  });

  describe('error type detection', () => {
    it('should detect network error type', () => {
      const error = new NetworkError('Connection failed', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('network');
    });

    it('should detect configuration error type', () => {
      const error = new ConfigurationError('Invalid config', 'key');
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('configuration');
    });

    it('should default to unknown type', () => {
      const error = { message: 'Plain error' };
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('unknown');
    });
  });

  describe('recovery strategy', () => {
    it('should include recovery information for retryable errors', () => {
      const error = new NetworkError('Rate limited', { status: 429 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.recovery).toBeDefined();
      expect(response.error.recovery?.canRecover).toBe(true);
    });

    it('should not include recovery for non-retryable errors', () => {
      const error = new NetworkError('Bad request', { status: 400 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.recovery?.canRecover).toBe(false);
    });
  });
});

describe('SuccessResponseBuilder', () => {
  describe('basic success response', () => {
    it('should create success response with data', () => {
      const builder = new SuccessResponseBuilder({ id: 1, name: 'Test' });
      const response = builder.build();

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(response.meta?.timestamp).toBeDefined();
    });

    it('should include correlation ID when provided', () => {
      const builder = new SuccessResponseBuilder({ id: 1 }, 'corr-123');
      const response = builder.build();

      expect(response.meta?.correlationId).toBe('corr-123');
    });
  });

  describe('withMeta', () => {
    it('should add metadata', () => {
      const builder = new SuccessResponseBuilder({ id: 1 });
      builder.withMeta({ version: '1.0' });
      const response = builder.build();

      expect(response.meta?.version).toBe('1.0');
    });
  });

  describe('sendSuccessResponse', () => {
    it('should send success response via Express response', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      sendSuccessResponse(mockRes, { id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: { id: 1 },
      }));
    });
  });
});

describe('createErrorResponse', () => {
  it('should create an ErrorResponseBuilder', () => {
    const error = new NetworkError('Test', { status: 500 });
    const builder = createErrorResponse(error, 'corr-123');

    expect(builder).toBeInstanceOf(ErrorResponseBuilder);
    const response = builder.build();
    expect(response.success).toBe(false);
  });
});
