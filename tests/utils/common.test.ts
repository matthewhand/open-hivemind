import { getEmoji, permissions, environment, strings, arrays, validation } from '../../src/utils/common';

describe('utils/common', () => {
  describe('getEmoji', () => {
    it('should return a non-empty string', () => {
      expect(getEmoji().length).toBeGreaterThan(0);
    });
  });

  describe('permissions', () => {
    it('isUserAllowed should return true', () => {
      expect(permissions.isUserAllowed()).toBe(true);
    });

    it('isRoleAllowed should return true', () => {
      expect(permissions.isRoleAllowed()).toBe(true);
    });
  });

  describe('environment', () => {
    it('get should return env variable value', () => {
      process.env.TEST_COMMON_VAR = 'hello';
      expect(environment.get('TEST_COMMON_VAR')).toBe('hello');
      delete process.env.TEST_COMMON_VAR;
    });

    it('get should return fallback when env is not set', () => {
      delete process.env.NONEXISTENT_VAR_12345;
      expect(environment.get('NONEXISTENT_VAR_12345', 'default')).toBe('default');
    });

    it('isDevelopment should return boolean', () => {
      expect(typeof environment.isDevelopment()).toBe('boolean');
    });

    it('isProduction should return boolean', () => {
      expect(typeof environment.isProduction()).toBe('boolean');
    });
  });

  describe('strings', () => {
    it('capitalize should capitalize the first letter', () => {
      expect(strings.capitalize('hello')).toBe('Hello');
      expect(strings.capitalize('a')).toBe('A');
    });

    it('capitalize should handle empty string', () => {
      expect(strings.capitalize('')).toBe('');
    });

    it('truncate should truncate long strings', () => {
      expect(strings.truncate('hello world', 5)).toBe('hello...');
    });

    it('truncate should not truncate short strings', () => {
      expect(strings.truncate('hi', 10)).toBe('hi');
    });
  });

  describe('arrays', () => {
    it('random should return an element from the array', () => {
      const arr = [1, 2, 3];
      const result = arrays.random(arr);
      expect(arr).toContain(result);
    });

    it('random should return undefined for empty array', () => {
      expect(arrays.random([])).toBeUndefined();
    });

    it('unique should remove duplicates', () => {
      expect(arrays.unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('unique should handle empty array', () => {
      expect(arrays.unique([])).toEqual([]);
    });
  });

  describe('validation', () => {
    it('isEmpty should return true for empty/whitespace strings', () => {
      expect(validation.isEmpty('')).toBe(true);
      expect(validation.isEmpty('   ')).toBe(true);
    });

    it('isEmpty should return false for non-empty strings', () => {
      expect(validation.isEmpty('hello')).toBe(false);
    });

    it('isDefined should return true for defined values', () => {
      expect(validation.isDefined(0)).toBe(true);
      expect(validation.isDefined('')).toBe(true);
      expect(validation.isDefined(false)).toBe(true);
    });

    it('isDefined should return false for null/undefined', () => {
      expect(validation.isDefined(null)).toBe(false);
      expect(validation.isDefined(undefined)).toBe(false);
    });
  });
});
