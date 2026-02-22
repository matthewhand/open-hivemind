/**
 * Tests for HivemindError and related error classes
 */

import {
  BotNotFoundError,
  DatabaseConnectionError,
  DatabaseNotInitializedError,
  DatabaseQueryError,
  ErrorCategory,
  generateErrorId,
  getErrorCategory,
  getErrorCode,
  HivemindError,
  InputValidationError,
  InvalidConfigError,
  isHivemindError,
  MCPConnectionError,
  MissingConfigError,
  NotImplementedError,
  TimeoutError,
  wrapError,
} from '@src/common/errors/HivemindError';

describe('HivemindError', () => {
  describe('Error Classes', () => {
    describe('DatabaseNotInitializedError', () => {
      it('should create error with correct properties', () => {
        const error = new DatabaseNotInitializedError('Database not ready');

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(HivemindError);
        expect(error.code).toBe('DB_NOT_INITIALIZED');
        expect(error.category).toBe('database');
        expect(error.message).toBe('Database not ready');
        expect(error.timestamp).toBeDefined();
      });

      it('should include context', () => {
        const context = { operation: 'query', table: 'users' };
        const error = new DatabaseNotInitializedError('DB error', context);

        expect(error.context).toEqual(context);
      });
    });

    describe('DatabaseConnectionError', () => {
      it('should create error with correct properties', () => {
        const error = new DatabaseConnectionError('Connection failed');

        expect(error.code).toBe('DB_CONNECTION_FAILED');
        expect(error.category).toBe('database');
      });

      it('should include cause chain', () => {
        const cause = new Error('ECONNREFUSED');
        const error = new DatabaseConnectionError('Connection failed', {}, cause);

        expect(error.cause).toBe(cause);
      });
    });

    describe('DatabaseQueryError', () => {
      it('should create error with correct properties', () => {
        const error = new DatabaseQueryError('Query failed');

        expect(error.code).toBe('DB_QUERY_FAILED');
        expect(error.category).toBe('database');
      });
    });

    describe('BotNotFoundError', () => {
      it('should create error with correct properties', () => {
        const error = new BotNotFoundError('my-bot');

        expect(error.code).toBe('BOT_NOT_FOUND');
        expect(error.category).toBe('network');
        expect(error.message).toContain('my-bot');
      });

      it('should include bot name in context', () => {
        const error = new BotNotFoundError('test-bot');

        expect(error.context.botName).toBe('test-bot');
      });
    });

    describe('MCPConnectionError', () => {
      it('should create error with correct properties', () => {
        const error = new MCPConnectionError('mcp-server-1', 'Connection timeout');

        expect(error.code).toBe('MCP_CONNECTION_FAILED');
        expect(error.category).toBe('network');
        expect(error.message).toContain('mcp-server-1');
        expect(error.context.serverName).toBe('mcp-server-1');
      });
    });

    describe('MissingConfigError', () => {
      it('should create error with correct properties', () => {
        const error = new MissingConfigError('API_KEY');

        expect(error.code).toBe('MISSING_CONFIG');
        expect(error.category).toBe('validation');
        expect(error.message).toContain('API_KEY');
        expect(error.context.configKey).toBe('API_KEY');
      });
    });

    describe('InputValidationError', () => {
      it('should create error with correct properties', () => {
        const error = new InputValidationError('email', 'invalid-email', 'Invalid email format');

        expect(error.code).toBe('INVALID_INPUT');
        expect(error.category).toBe('validation');
        expect(error.message).toContain('email');
        expect(error.context.field).toBe('email');
      });

      it('should include field information', () => {
        const error = new InputValidationError('email', 'invalid-email', 'Invalid email format');

        expect(error.context.field).toBe('email');
        expect(error.context.value).toBe('invalid-email');
      });
    });

    describe('InvalidConfigError', () => {
      it('should create error with correct properties', () => {
        const error = new InvalidConfigError('Invalid PORT: must be a number', {
          configKey: 'PORT',
          reason: 'Must be a number',
        });

        expect(error.code).toBe('INVALID_CONFIG');
        expect(error.category).toBe('configuration');
        expect(error.context.configKey).toBe('PORT');
        expect(error.context.reason).toBe('Must be a number');
      });
    });

    describe('TimeoutError', () => {
      it('should create error with correct properties', () => {
        const error = new TimeoutError('api-call', 5000);

        expect(error.code).toBe('TIMEOUT');
        expect(error.category).toBe('system');
        expect(error.context.operation).toBe('api-call');
        expect(error.context.timeoutMs).toBe(5000);
      });
    });

    describe('NotImplementedError', () => {
      it('should create error with correct properties', () => {
        const error = new NotImplementedError('feature-x');

        expect(error.code).toBe('NOT_IMPLEMENTED');
        expect(error.category).toBe('system');
        expect(error.message).toContain('feature-x');
      });
    });
  });

  describe('Helper Functions', () => {
    describe('isHivemindError', () => {
      it('should return true for HivemindError instances', () => {
        const error = new DatabaseNotInitializedError('test');
        expect(isHivemindError(error)).toBe(true);
      });

      it('should return false for regular errors', () => {
        const error = new Error('test');
        expect(isHivemindError(error)).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isHivemindError(null)).toBe(false);
        expect(isHivemindError(undefined)).toBe(false);
        expect(isHivemindError('error')).toBe(false);
        expect(isHivemindError({})).toBe(false);
      });
    });

    describe('getErrorCode', () => {
      it('should return error code for HivemindError', () => {
        const error = new DatabaseNotInitializedError('test');
        expect(getErrorCode(error)).toBe('DB_NOT_INITIALIZED');
      });

      it('should return UNKNOWN for regular errors', () => {
        const error = new Error('test');
        expect(getErrorCode(error)).toBe('UNKNOWN');
      });
    });

    describe('getErrorCategory', () => {
      it('should return category for HivemindError', () => {
        const error = new DatabaseNotInitializedError('test');
        expect(getErrorCategory(error)).toBe('database');
      });

      it('should return system for regular errors', () => {
        const error = new Error('test');
        expect(getErrorCategory(error)).toBe('system');
      });
    });

    describe('generateErrorId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateErrorId();
        const id2 = generateErrorId();

        expect(id1).not.toBe(id2);
        // generateErrorId returns UUID format
        expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    });

    describe('wrapError', () => {
      it('should wrap regular errors in HivemindError', () => {
        const originalError = new Error('Original error');
        const wrapped = wrapError(originalError, { someContext: 'value' });

        expect(isHivemindError(wrapped)).toBe(true);
        expect(wrapped.code).toBe('WRAPPED_ERROR');
        expect(wrapped.category).toBe('system');
        expect(wrapped.cause).toBe(originalError);
      });

      it('should return HivemindError as-is', () => {
        const error = new DatabaseNotInitializedError('test');
        const wrapped = wrapError(error, { someContext: 'value' });

        expect(wrapped).toBe(error);
      });
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new DatabaseConnectionError('Connection failed', { host: 'localhost' });
      error.traceId = 'trace-123';

      const json = error.toJSON();

      expect(json.code).toBe('DB_CONNECTION_FAILED');
      expect(json.category).toBe('database');
      expect(json.message).toBe('Connection failed');
      expect(json.timestamp).toBeDefined();
      expect(json.traceId).toBe('trace-123');
      expect(json.context).toEqual({ host: 'localhost' });
    });

    it('should include cause chain in JSON', () => {
      const cause = new Error('Underlying error');
      const error = new DatabaseConnectionError('Connection failed', {}, cause);

      const json = error.toJSON();

      expect(json.cause).toBeDefined();
      expect(json.cause.message).toBe('Underlying error');
    });
  });

  describe('traceId', () => {
    it('should allow setting trace ID', () => {
      const error = new DatabaseNotInitializedError('test');
      error.traceId = 'trace-456';

      expect(error.traceId).toBe('trace-456');
    });
  });
});
