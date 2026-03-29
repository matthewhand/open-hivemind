import { describe, it, expect } from '@jest/globals';
import {
  compareVersions,
  parseVersion,
  isNewerVersion,
  extractVersionFromTag,
  formatVersionComparison,
} from '@src/server/utils/versionTracking';

describe('versionTracking', () => {
  describe('parseVersion', () => {
    it('should parse standard semantic version', () => {
      const version = parseVersion('1.2.3');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should handle v prefix', () => {
      const version = parseVersion('v1.2.3');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should handle missing patch version', () => {
      const version = parseVersion('1.2');
      expect(version).toEqual({ major: 1, minor: 2, patch: 0 });
    });

    it('should handle missing minor and patch', () => {
      const version = parseVersion('1');
      expect(version).toEqual({ major: 1, minor: 0, patch: 0 });
    });

    it('should handle version with build metadata', () => {
      const version = parseVersion('1.2.3+build.123');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should handle version with pre-release', () => {
      const version = parseVersion('1.2.3-alpha.1');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should return 0.0.0 for invalid versions', () => {
      const version = parseVersion('invalid');
      expect(version).toEqual({ major: 0, minor: 0, patch: 0 });
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
    });

    it('should return positive when first version is newer', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.3.0', '1.2.9')).toBeGreaterThan(0);
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    });

    it('should return negative when first version is older', () => {
      expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('1.2.9', '1.3.0')).toBeLessThan(0);
      expect(compareVersions('1.2.3', '1.2.4')).toBeLessThan(0);
    });

    it('should compare major versions first', () => {
      expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    });

    it('should compare minor versions when major is equal', () => {
      expect(compareVersions('1.3.0', '1.2.99')).toBeGreaterThan(0);
    });

    it('should compare patch versions when major and minor are equal', () => {
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    });
  });

  describe('isNewerVersion', () => {
    it('should return true when current is newer', () => {
      expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
      expect(isNewerVersion('1.3.0', '1.2.5')).toBe(true);
      expect(isNewerVersion('1.2.4', '1.2.3')).toBe(true);
    });

    it('should return false when current is older or equal', () => {
      expect(isNewerVersion('1.9.9', '2.0.0')).toBe(false);
      expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false);
      expect(isNewerVersion('1.2.3', '1.2.4')).toBe(false);
    });

    it('should handle v prefix in comparisons', () => {
      expect(isNewerVersion('v2.0.0', '1.9.9')).toBe(true);
      expect(isNewerVersion('2.0.0', 'v1.9.9')).toBe(true);
    });
  });

  describe('extractVersionFromTag', () => {
    it('should extract version from standard tags', () => {
      expect(extractVersionFromTag('v1.2.3')).toBe('1.2.3');
      expect(extractVersionFromTag('1.2.3')).toBe('1.2.3');
    });

    it('should extract version from tags with release prefix', () => {
      expect(extractVersionFromTag('release-1.2.3')).toBe('1.2.3');
      expect(extractVersionFromTag('release/1.2.3')).toBe('1.2.3');
    });

    it('should extract version from tags with @ prefix', () => {
      expect(extractVersionFromTag('package@1.2.3')).toBe('1.2.3');
      expect(extractVersionFromTag('@scope/package@1.2.3')).toBe('1.2.3');
    });

    it('should handle complex tag formats', () => {
      expect(extractVersionFromTag('refs/tags/v1.2.3')).toBe('1.2.3');
      expect(extractVersionFromTag('release-v1.2.3-beta')).toContain('1.2.3');
    });

    it('should return original tag if no version found', () => {
      expect(extractVersionFromTag('latest')).toBe('latest');
      expect(extractVersionFromTag('main')).toBe('main');
    });
  });

  describe('formatVersionComparison', () => {
    it('should format version comparison arrow', () => {
      const formatted = formatVersionComparison('1.2.3', '1.3.0');
      expect(formatted).toBe('v1.2.3 → v1.3.0');
    });

    it('should handle v prefix in input', () => {
      const formatted = formatVersionComparison('v1.2.3', 'v1.3.0');
      expect(formatted).toBe('v1.2.3 → v1.3.0');
    });

    it('should work with different version formats', () => {
      const formatted = formatVersionComparison('1.0', '2.0.0');
      expect(formatted).toContain('→');
      expect(formatted).toContain('1.0');
      expect(formatted).toContain('2.0.0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(parseVersion('')).toEqual({ major: 0, minor: 0, patch: 0 });
      expect(compareVersions('', '1.0.0')).toBeLessThan(0);
    });

    it('should handle versions with leading zeros', () => {
      const version = parseVersion('01.02.03');
      expect(version).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should handle very large version numbers', () => {
      const version = parseVersion('999.999.999');
      expect(version).toEqual({ major: 999, minor: 999, patch: 999 });
    });

    it('should handle versions with extra dots', () => {
      const version = parseVersion('1.2.3.4.5');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      // Should ignore additional segments
    });

    it('should handle comparison with invalid versions', () => {
      expect(compareVersions('invalid', '1.0.0')).toBeLessThan(0);
      expect(compareVersions('1.0.0', 'invalid')).toBeGreaterThan(0);
      expect(compareVersions('invalid', 'invalid')).toBe(0);
    });

    it('should handle mixed valid and invalid versions', () => {
      expect(isNewerVersion('2.0.0', 'invalid')).toBe(true);
      expect(isNewerVersion('invalid', '2.0.0')).toBe(false);
    });
  });

  describe('Real-World Version Scenarios', () => {
    it('should handle npm package versions', () => {
      expect(isNewerVersion('1.0.0', '0.9.99')).toBe(true);
      expect(isNewerVersion('2.0.0-beta.1', '1.9.9')).toBe(true);
    });

    it('should handle git tag versions', () => {
      expect(extractVersionFromTag('refs/tags/v1.2.3')).toBe('1.2.3');
      expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    });

    it('should handle semantic versioning pre-releases', () => {
      const alpha = parseVersion('1.0.0-alpha');
      const beta = parseVersion('1.0.0-beta');
      const release = parseVersion('1.0.0');

      expect(alpha.major).toBe(1);
      expect(beta.major).toBe(1);
      expect(release.major).toBe(1);
    });

    it('should handle common version progressions', () => {
      const versions = ['0.1.0', '0.2.0', '1.0.0', '1.1.0', '2.0.0'];

      for (let i = 1; i < versions.length; i++) {
        expect(isNewerVersion(versions[i], versions[i - 1])).toBe(true);
      }
    });
  });
});
