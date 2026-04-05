import { ErrorResponseBuilder } from '../../../src/utils/errorResponse';
import { ConfigurationError, AuthenticationError, NetworkError, ValidationError } from '../../../src/types/errorClasses';

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
      const error = new ValidationError('Validation failed', 'email', 'invalid@email', 'valid email');
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

  describe('withStack', () => {
    it('should include stack trace when enabled', () => {
      const error = new NetworkError('Test error', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      builder.withStack(true);
      const response = builder.build();

      expect(response.stack).toBeDefined();
    });

    it('should not include stack trace when disabled', () => {
      const error = new NetworkError('Test error', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      builder.withStack(false);
      const response = builder.build();

      expect(response.stack).toBeUndefined();
    });
  });

  describe('getHttpStatusCode', () => {
    it('should return 400 for ConfigurationError', () => {
      const error = new ConfigurationError('Invalid config', 'invalid');
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getHttpStatusCode()).toBe(400);
    });

    it('should return 401 for AuthenticationError', () => {
      const error = new AuthenticationError('Unauthorized');
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getHttpStatusCode()).toBe(401);
    });

    it('should return 500 for network errors', () => {
      const error = new NetworkError('Server error', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getHttpStatusCode()).toBe(500);
    });
  });

  describe('send', () => {
    it('should send error response via Express response', () => {
      const error = new NetworkError('Test error', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      builder.withRequest('/api/test', 'POST');

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      builder.send(mockRes);

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
    it('should detect configuration error type', () => {
      const error = new ConfigurationError('Invalid', 'invalid');
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('configuration');
    });

    it('should detect authentication error type', () => {
      const error = new AuthenticationError('Unauthorized');
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('authentication');
    });

    it('should detect network error type', () => {
      const error = new NetworkError('Connection failed', { status: 500 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.type).toBe('network');
    });
  });

  describe('recovery strategy', () => {
    it('should include recovery information for retryable errors', () => {
      const error = new NetworkError('Rate limited', { status: 429 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.recovery).toBeDefined();
      expect(response.error.recovery?.canRecover).toBe(true);
      expect(response.error.recovery?.retryDelay).toBeDefined();
    });

    it('should not include recovery for non-retryable errors', () => {
      const error = new NetworkError('Bad request', { status: 400 });
      const builder = new ErrorResponseBuilder(error);
      const response = builder.build();

      expect(response.error.recovery?.canRecover).toBe(false);
    });
  });
});
