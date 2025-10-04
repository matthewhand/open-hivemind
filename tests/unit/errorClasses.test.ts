import { BaseHivemindError, NetworkError, ValidationError, ConfigurationError, DatabaseError, AuthenticationError, AuthorizationError, RateLimitError, TimeoutError, ApiError } from '../../src/types/errorClasses';

describe('Error Classes', () => {
  test('should create BaseHivemindError with proper properties', () => {
    const error = new (class extends BaseHivemindError {
      constructor(message: string, statusCode: number, code: string) {
        super(message, 'unknown', code, statusCode);
      }
      getRecoveryStrategy() {
        return { canRecover: false };
      }
    })('Test error', 500, 'TEST_ERROR');

    expect(error).toBeInstanceOf(BaseHivemindError);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.timestamp).toBeDefined();
    expect(error.correlationId).toBeDefined();
    expect(error.severity).toBe('high');
  });

  test('should create NetworkError with proper properties', () => {
    const error = new NetworkError('Network error occurred');

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('Network error occurred');
    expect(error.status).toBe(503);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.severity).toBe('medium');
  });

  test('should create ValidationError with properties', () => {
    const error = new ValidationError('Invalid input', { field: 'name', reason: 'required' });

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Invalid input');
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'name', reason: 'required' });
  });

  test('should create ConfigurationError with proper properties', () => {
    const error = new ConfigurationError('Missing required config');

    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error.message).toBe('Missing required config');
    expect(error.status).toBe(500);
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.severity).toBe('critical');
  });

  test('should create DatabaseError with proper properties', () => {
    const error = new DatabaseError('Database connection failed');

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.message).toBe('Database connection failed');
    expect(error.status).toBe(500);
    expect(error.code).toBe('DATABASE_ERROR');
  });

  test('should create AuthenticationError with proper properties', () => {
    const error = new AuthenticationError('Invalid credentials');

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Invalid credentials');
    expect(error.status).toBe(401);
    expect(error.code).toBe('AUTH_ERROR');
  });

  test('should create AuthorizationError with proper properties', () => {
    const error = new AuthorizationError('Insufficient permissions');

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe('Insufficient permissions');
    expect(error.status).toBe(403);
    expect(error.code).toBe('AUTHZ_ERROR');
  });

  test('should create RateLimitError with proper properties', () => {
    const error = new RateLimitError('Rate limit exceeded');

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.status).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_ERROR');
  });

  test('should create TimeoutError with proper properties', () => {
    const error = new TimeoutError('Request timeout');

    expect(error).toBeInstanceOf(TimeoutError);
    expect(error.message).toBe('Request timeout');
    expect(error.status).toBe(408);
    expect(error.code).toBe('TIMEOUT_ERROR');
  });

  test('should create ApiError with proper properties', () => {
    const error = new ApiError('API error occurred', 'test-service', undefined, 502);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('API error occurred');
    expect(error.status).toBe(502);
    expect(error.code).toBe('API_ERROR');
  });
});