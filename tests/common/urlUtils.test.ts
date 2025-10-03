import {
  buildUrl,
  normalizeUrl,
  ensureTrailingSlash,
  removeTrailingSlash,
} from '../../src/common/urlUtils';

describe('urlUtils', () => {
  describe('buildUrl', () => {
    it('should build URL from base and no parts', () => {
      expect(buildUrl('https://example.com/api')).toBe('https://example.com/api');
      expect(buildUrl('https://example.com/api/')).toBe('https://example.com/api');
    });

    it('should handle empty or undefined parts', () => {
      expect(buildUrl('https://example.com', '')).toBe('https://example.com');
      expect(buildUrl('https://example.com', undefined)).toBe('https://example.com');
      expect(buildUrl('https://example.com', '', undefined, ' ')).toBe('https://example.com');
    });

    it('should join paths correctly, handling leading/trailing slashes', () => {
      expect(buildUrl('https://example.com', 'users')).toBe('https://example.com/users');
      expect(buildUrl('https://example.com/', '/users/')).toBe('https://example.com/users');
      expect(buildUrl('https://example.com/api', 'v1', 'users')).toBe('https://example.com/api/v1/users');
      expect(buildUrl('https://example.com/api/', '/v1/', 'users/')).toBe('https://example.com/api/v1/users');
    });

    it('should preserve protocol and domain', () => {
      expect(buildUrl('https://example.com:8080', 'path')).toBe('https://example.com:8080/path');
      expect(buildUrl('http://localhost', 'api', 'test')).toBe('http://localhost/api/test');
    });

    it('should handle multiple parts', () => {
      expect(buildUrl('https://example.com', 'a', 'b', 'c')).toBe('https://example.com/a/b/c');
    });
  });

  describe('normalizeUrl', () => {
    it('should remove trailing slash unless root', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
      expect(normalizeUrl('/')).toBe('/');
      expect(normalizeUrl(' / ')).toBe('/');
    });

    it('should handle various cases', () => {
      expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });
  });

  describe('ensureTrailingSlash', () => {
    it('should add trailing slash if not present', () => {
      expect(ensureTrailingSlash('https://example.com')).toBe('https://example.com/');
      expect(ensureTrailingSlash('https://example.com/path')).toBe('https://example.com/path/');
    });

    it('should preserve trailing slash', () => {
      expect(ensureTrailingSlash('https://example.com/')).toBe('https://example.com/');
      expect(ensureTrailingSlash('/')).toBe('/');
    });
  });

  describe('removeTrailingSlash', () => {
    it('should remove trailing slash', () => {
      expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com');
      expect(removeTrailingSlash('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should handle no trailing slash', () => {
      expect(removeTrailingSlash('https://example.com')).toBe('https://example.com');
      expect(removeTrailingSlash('/')).toBe('/');
    });
  });
});