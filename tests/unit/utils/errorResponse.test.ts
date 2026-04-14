import { createErrorResponse } from '../../../src/utils/errorResponse';
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

  describe('getStatusCode', () => {
    it('should return 500 for general errors', () => {
      const error = { code: 'INTERNAL_SERVER_ERROR', message: 'Error' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(500);
    });

    it('should return 401 for AUTH_ERROR', () => {
      const error = { code: 'AUTH_ERROR', message: 'Unauthorized' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(401);
    });

    it('should return 400 for VALIDATION_ERROR', () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Invalid' };
      const builder = new ErrorResponseBuilder(error);
      expect(builder.getStatusCode()).toBe(400);
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

describe('createErrorResponse', () => {
  it('should create an ErrorResponseBuilder', () => {
    const error = new NetworkError('Test', { status: 500 });
    const builder = createErrorResponse(error, 'corr-123');

    expect(builder).toBeInstanceOf(ErrorResponseBuilder);
    const response = builder.build();
    expect(response.success).toBe(false);
  });
});
