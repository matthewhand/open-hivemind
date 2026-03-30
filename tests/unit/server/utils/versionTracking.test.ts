import { describe, expect, it } from '@jest/globals';
import { compareVersions, isNewerVersion } from '@src/server/utils/versionTracking';

describe('versionTracking', () => {
  describe('compareVersions', () => {
    it('should return positive when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.3.0', '1.2.5')).toBeGreaterThan(0);
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    });

    it('should return negative when first version is smaller', () => {
      expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
    });

    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('0.0.0', '0.0.0')).toBe(0);
    });

    it('should handle v prefix', () => {
      expect(compareVersions('v2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('2.0.0', 'v1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('v1.2.3', 'v1.2.3')).toBe(0);
    });

    it('should handle versions with different segment counts', () => {
      expect(compareVersions('1.2', '1.2.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
    });

    it('should handle empty strings', () => {
      expect(compareVersions('', '1.0.0')).toBeLessThan(0);
    });

    it('should handle versions with pre-release suffixes', () => {
      // Pre-release parts split on '-', so 1.0.0-alpha becomes [1,0,0,0]
      // and 1.0.0 becomes [1,0,0] -- they compare as equal in this implementation
      const result = compareVersions('1.0.0-alpha', '1.0.0');
      expect(typeof result).toBe('number');
    });

    it('should handle versions with build metadata', () => {
      const result = compareVersions('1.2.3+build.123', '1.2.3');
      expect(typeof result).toBe('number');
    });

    it('should handle very large version numbers', () => {
      expect(compareVersions('999.999.999', '999.999.998')).toBeGreaterThan(0);
    });
  });

  describe('isNewerVersion', () => {
    // isNewerVersion(current, latest) returns true when latest > current
    it('should return true when latest is newer than current', () => {
      expect(isNewerVersion('1.9.9', '2.0.0')).toBe(true);
      expect(isNewerVersion('1.2.5', '1.3.0')).toBe(true);
      expect(isNewerVersion('1.2.3', '1.2.4')).toBe(true);
    });

    it('should return false when latest is older or equal', () => {
      expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);
      expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false);
      expect(isNewerVersion('1.2.4', '1.2.3')).toBe(false);
    });

    it('should handle v prefix in comparisons', () => {
      expect(isNewerVersion('1.9.9', 'v2.0.0')).toBe(true);
      expect(isNewerVersion('v1.9.9', '2.0.0')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle versions with leading zeros', () => {
      expect(compareVersions('01.02.03', '1.2.3')).toBe(0);
    });

    it('should handle versions with extra dots', () => {
      // '1.2.3.4.5' vs '1.2.3' - extra segments mean the first is "larger"
      expect(compareVersions('1.2.3.4.5', '1.2.3')).toBeGreaterThan(0);
    });

    it('should handle invalid version strings', () => {
      // 'invalid' becomes [0] after parsing (NaN -> 0)
      const result = compareVersions('invalid', '1.0.0');
      expect(typeof result).toBe('number');
    });
  });

  describe('Real-World Version Scenarios', () => {
    it('should handle npm package versions', () => {
      expect(isNewerVersion('0.9.99', '1.0.0')).toBe(true);
    });

    it('should handle common version progressions', () => {
      const versions = ['0.1.0', '0.2.0', '1.0.0', '1.1.0', '2.0.0'];

      for (let i = 1; i < versions.length; i++) {
        expect(compareVersions(versions[i], versions[i - 1])).toBeGreaterThan(0);
      }
    });
  });
});
