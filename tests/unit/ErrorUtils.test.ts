import { ErrorUtils, AppError, isHivemindError, isAppError } from '../../src/types/errors';

describe('ErrorUtils', () => {
  describe('getMessage', () => {
    it('should return message from Error instance', () => {
      const error = new Error('test error');
      expect(ErrorUtils.getMessage(error)).toBe('test error');
    });

    it('should return string directly', () => {
      expect(ErrorUtils.getMessage('string error')).toBe('string error');
    });

    it('should return message from object', () => {
      expect(ErrorUtils.getMessage({ message: 'object error' })).toBe('object error');
    });

    it('should return default message for unknown types', () => {
      expect(ErrorUtils.getMessage(null)).toBe('Unknown error occurred');
      expect(ErrorUtils.getMessage(undefined)).toBe('Unknown error occurred');
      expect(ErrorUtils.getMessage({})).toBe('Unknown error occurred');
    });
  });

  describe('getCode', () => {
    it('should return code from object', () => {
      expect(ErrorUtils.getCode({ code: 'ERR_TEST' })).toBe('ERR_TEST');
    });

    it('should return undefined if no code exists', () => {
      expect(ErrorUtils.getCode(new Error('test'))).toBeUndefined();
      expect(ErrorUtils.getCode(null)).toBeUndefined();
    });
  });

  describe('getStatusCode', () => {
    it('should return statusCode from object', () => {
      expect(ErrorUtils.getStatusCode({ statusCode: 404 })).toBe(404);
    });

    it('should return status from Axios error response', () => {
      const axiosError = { isAxiosError: true, response: { status: 500 } };
      expect(ErrorUtils.getStatusCode(axiosError as any)).toBe(500);
    });

    it('should return undefined if no status code exists', () => {
      expect(ErrorUtils.getStatusCode(new Error('test'))).toBeUndefined();
      expect(ErrorUtils.getStatusCode(null)).toBeUndefined();
    });
  });

  describe('isAxiosError', () => {
    it('should return true for Axios error', () => {
      expect(ErrorUtils.isAxiosError({ isAxiosError: true })).toBe(true);
    });

    it('should return false for non-Axios error', () => {
      expect(ErrorUtils.isAxiosError(new Error('test'))).toBe(false);
      expect(ErrorUtils.isAxiosError({ isAxiosError: false })).toBe(false);
      expect(ErrorUtils.isAxiosError(null)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for Axios error', () => {
      expect(ErrorUtils.isNetworkError({ isAxiosError: true })).toBe(true);
    });

    it('should return true for network error type', () => {
      expect(ErrorUtils.isNetworkError({ type: 'network' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(ErrorUtils.isNetworkError(new Error('test'))).toBe(false);
      expect(ErrorUtils.isNetworkError({ type: 'api' })).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('should return retryable property if exists', () => {
      expect(ErrorUtils.isRetryable({ retryable: true })).toBe(true);
      expect(ErrorUtils.isRetryable({ retryable: false })).toBe(false);
    });

    it('should return true for server errors (5xx)', () => {
      expect(ErrorUtils.isRetryable({ statusCode: 500 })).toBe(true);
      expect(ErrorUtils.isRetryable({ statusCode: 503 })).toBe(true);
    });

    it('should return true for rate limit errors (429)', () => {
      expect(ErrorUtils.isRetryable({ statusCode: 429 })).toBe(true);
    });

    it('should return false for other client errors (4xx)', () => {
      expect(ErrorUtils.isRetryable({ statusCode: 400 })).toBe(false);
      expect(ErrorUtils.isRetryable({ statusCode: 404 })).toBe(false);
    });

    it('should return false if no status code or retryable property', () => {
      expect(ErrorUtils.isRetryable(new Error('test'))).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should classify rate limit error', () => {
      expect(ErrorUtils.classifyError({ statusCode: 429 })).toEqual(
        expect.objectContaining({ type: 'rate-limit', retryable: true, severity: 'medium' })
      );
      expect(ErrorUtils.classifyError(new Error('rate limit exceeded'))).toEqual(
        expect.objectContaining({ type: 'rate-limit', retryable: true, severity: 'medium' })
      );
    });

    it('should classify authentication error', () => {
      expect(ErrorUtils.classifyError({ statusCode: 401 })).toEqual(
        expect.objectContaining({ type: 'authentication', retryable: false, severity: 'high' })
      );
      expect(ErrorUtils.classifyError(new Error('unauthorized access'))).toEqual(
        expect.objectContaining({ type: 'authentication', retryable: false, severity: 'high' })
      );
    });

    it('should classify authorization error', () => {
      expect(ErrorUtils.classifyError({ statusCode: 403 })).toEqual(
        expect.objectContaining({ type: 'authorization', retryable: false, severity: 'high' })
      );
      expect(ErrorUtils.classifyError(new Error('permission denied'))).toEqual(
        expect.objectContaining({ type: 'authorization', retryable: false, severity: 'high' })
      );
    });

    it('should classify timeout/network error', () => {
      expect(ErrorUtils.classifyError({ statusCode: 408 })).toEqual(
        expect.objectContaining({ type: 'timeout', retryable: true, severity: 'medium' })
      );
      expect(ErrorUtils.classifyError(new Error('network connection failed'))).toEqual(
        expect.objectContaining({ type: 'timeout', retryable: true, severity: 'medium' })
      );
    });

    it('should classify server api error (5xx)', () => {
      expect(ErrorUtils.classifyError({ statusCode: 500 })).toEqual(
        expect.objectContaining({ type: 'api', retryable: true, severity: 'high' })
      );
    });

    it('should classify client api error (4xx)', () => {
      expect(ErrorUtils.classifyError({ statusCode: 400 })).toEqual(
        expect.objectContaining({ type: 'api', retryable: false, severity: 'medium' })
      );
    });

    it('should classify validation error', () => {
      expect(ErrorUtils.classifyError(new Error('invalid input data'))).toEqual(
        expect.objectContaining({ type: 'validation', retryable: false, severity: 'low' })
      );
    });

    it('should classify configuration error', () => {
      expect(ErrorUtils.classifyError(new Error('missing configuration'))).toEqual(
        expect.objectContaining({ type: 'configuration', retryable: false, severity: 'high' })
      );
    });

    it('should classify database error', () => {
      expect(ErrorUtils.classifyError(new Error('database connection error'))).toEqual(
        expect.objectContaining({ type: 'database', retryable: true, severity: 'high' })
      );
    });

    it('should classify unknown error by default', () => {
      expect(ErrorUtils.classifyError(new Error('something strange happened'))).toEqual(
        expect.objectContaining({ type: 'unknown', retryable: false, severity: 'medium' })
      );
    });
  });

  describe('toHivemindError', () => {
    it('should return the error if it is already a HivemindError', () => {
      const err = ErrorUtils.createError('test');
      expect(ErrorUtils.toHivemindError(err)).toBe(err);
    });

    it('should return standard Error if given an Error instance', () => {
      const err = new Error('standard error');
      expect(ErrorUtils.toHivemindError(err)).toBe(err);
    });

    it('should wrap string in an error', () => {
      const err = ErrorUtils.toHivemindError('string error');
      expect((err as AppError).message).toBe('string error');
    });

    it('should wrap unknown objects with default message', () => {
      const err = ErrorUtils.toHivemindError({ foo: 'bar' });
      expect((err as AppError).message).toBe('Unknown error occurred');
    });
  });

  describe('createError', () => {
    it('should create an AppError with default values', () => {
      const err = ErrorUtils.createError('test message');
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('test message');
      expect(err.type).toBe('unknown');
      expect(err.code).toBe('UNKNOWN');
      expect(err.statusCode).toBeUndefined();
      expect(err.details).toBeUndefined();
      expect(err.timestamp).toBeInstanceOf(Date);
      expect(err.retryable).toBe(false);
    });

    it('should create an AppError with specified values', () => {
      const details = { field: 'name' };
      const err = ErrorUtils.createError('test message', 'validation', 'VAL_ERR', 400, details);
      expect(err.message).toBe('test message');
      expect(err.type).toBe('validation');
      expect(err.code).toBe('VAL_ERR');
      expect(err.statusCode).toBe(400);
      expect(err.details).toBe(details);
    });
  });
});

describe('Type Guards', () => {
  describe('isHivemindError', () => {
    it('should return true for Error instances', () => {
      expect(isHivemindError(new Error('test'))).toBe(true);
    });

    it('should return true for objects with type or code', () => {
      expect(isHivemindError({ type: 'unknown' })).toBe(true);
      expect(isHivemindError({ code: 'ERR' })).toBe(true);
    });

    it('should return false for primitive values', () => {
      expect(isHivemindError('error')).toBe(false);
      expect(isHivemindError(null)).toBe(false);
      expect(isHivemindError(undefined)).toBe(false);
    });
  });

  describe('isAppError', () => {
    it('should return true for valid AppError', () => {
      const err = ErrorUtils.createError('test');
      expect(isAppError(err)).toBe(true);
    });

    it('should return false for standard Error', () => {
      expect(isAppError(new Error('test'))).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isAppError({ type: 'unknown', code: 'ERR' })).toBe(false);
      expect(isAppError(null)).toBe(false);
    });
  });
});
