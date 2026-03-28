import { ErrorUtils, ErrorClassification } from '../../src/common/ErrorUtils';

describe('ErrorUtils', () => {
  describe('toHivemindError', () => {
    it('should convert an Error instance', () => {
      const err = new Error('test error');
      const result = ErrorUtils.toHivemindError(err);
      expect(result.message).toBe('test error');
      expect(result.originalError).toBe(err);
    });

    it('should convert a string error', () => {
      const result = ErrorUtils.toHivemindError('string error');
      expect(result.message).toBe('string error');
    });

    it('should handle unknown error types', () => {
      const result = ErrorUtils.toHivemindError(42);
      expect(result.message).toBe('An unknown error occurred');
      expect(result.context).toHaveProperty('originalError', 42);
    });

    it('should include context when provided', () => {
      const ctx = { operation: 'test' };
      const result = ErrorUtils.toHivemindError('err', ctx);
      expect(result.context).toEqual(ctx);
    });

    it('should extract error code from Error-like objects', () => {
      const err: any = new Error('conn refused');
      err.code = 'ECONNREFUSED';
      const result = ErrorUtils.toHivemindError(err);
      expect(result.code).toBe('ECONNREFUSED');
    });
  });

  describe('classifyError', () => {
    it('should classify validation errors', () => {
      const result = ErrorUtils.classifyError({ message: 'Validation failed', code: 'VALIDATION_ERROR' });
      expect(result.classification).toBe(ErrorClassification.VALIDATION_ERROR);
      expect(result.logLevel).toBe('warn');
    });

    it('should classify network errors by code', () => {
      const result = ErrorUtils.classifyError({ message: 'fail', code: 'ECONNREFUSED' });
      expect(result.classification).toBe(ErrorClassification.NETWORK_ERROR);
      expect(result.logLevel).toBe('error');
    });

    it('should classify network errors by message', () => {
      const result = ErrorUtils.classifyError({ message: 'Network timeout' });
      expect(result.classification).toBe(ErrorClassification.NETWORK_ERROR);
    });

    it('should classify 4xx as user error', () => {
      const result = ErrorUtils.classifyError({ message: 'not found', statusCode: 404 });
      expect(result.classification).toBe(ErrorClassification.USER_ERROR);
      expect(result.logLevel).toBe('warn');
    });

    it('should classify 5xx as system error', () => {
      const result = ErrorUtils.classifyError({ message: 'server error', statusCode: 500 });
      expect(result.classification).toBe(ErrorClassification.SYSTEM_ERROR);
      expect(result.logLevel).toBe('error');
    });

    it('should default to unknown error', () => {
      const result = ErrorUtils.classifyError({ message: 'something' });
      expect(result.classification).toBe(ErrorClassification.UNKNOWN_ERROR);
    });
  });

  describe('getMessage', () => {
    it('should return original message for user errors', () => {
      const msg = ErrorUtils.getMessage({ message: 'bad request', statusCode: 400 });
      expect(msg).toBe('bad request');
    });

    it('should return original message for validation errors', () => {
      const msg = ErrorUtils.getMessage({ message: 'Validation issue', code: 'VALIDATION_ERROR' });
      expect(msg).toBe('Validation issue');
    });

    it('should return generic message for system errors', () => {
      const msg = ErrorUtils.getMessage({ message: 'db crashed', statusCode: 500 });
      expect(msg).toBe('An internal error occurred. Please try again later.');
    });
  });

  describe('handleError', () => {
    it('should not throw when handling an error', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => ErrorUtils.handleError(new Error('test'))).not.toThrow();
      spy.mockRestore();
    });

    it('should log warnings for validation errors', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      ErrorUtils.handleError(new Error('validation failed'));
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
