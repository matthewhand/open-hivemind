import { isHivemindError, isAppError } from '../../../src/types/errors';

describe('Error Type Guards', () => {
  describe('isHivemindError', () => {
    it('returns true for an Error instance', () => {
      expect(isHivemindError(new Error('test error'))).toBe(true);
    });

    it('returns true for an object with type property', () => {
      expect(isHivemindError({ type: 'network' })).toBe(true);
    });

    it('returns true for an object with code property', () => {
      expect(isHivemindError({ code: 'ERR_NETWORK' })).toBe(true);
    });

    it('returns true for an object with both type and code', () => {
      expect(isHivemindError({ type: 'network', code: 'ERR_NETWORK' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isHivemindError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isHivemindError(undefined)).toBe(false);
    });

    it('returns false for an empty object', () => {
      expect(isHivemindError({})).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isHivemindError('string')).toBe(false);
      expect(isHivemindError(42)).toBe(false);
      expect(isHivemindError(true)).toBe(false);
    });
  });

  describe('isAppError', () => {
    it('returns true for an Error with type and code properties', () => {
      const error = new Error('test error') as any;
      error.type = 'network';
      error.code = 'ERR_NETWORK';
      expect(isAppError(error)).toBe(true);
    });

    it('returns false for a plain Error without type and code', () => {
      expect(isAppError(new Error('test error'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it('returns false for a plain object with type and code (not Error instance)', () => {
      expect(isAppError({ type: 'network', code: 'ERR_NETWORK', message: 'fail' })).toBe(false);
    });

    it('returns false for an Error with only type', () => {
      const error = new Error('test error') as any;
      error.type = 'network';
      expect(isAppError(error)).toBe(false);
    });

    it('returns false for an Error with only code', () => {
      const error = new Error('test error') as any;
      error.code = 'ERR_NETWORK';
      expect(isAppError(error)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(isAppError('string')).toBe(false);
      expect(isAppError(42)).toBe(false);
      expect(isAppError(true)).toBe(false);
    });
  });
});
