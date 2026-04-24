import { isValidUrl } from '../../src/common/urlUtils';

describe('urlUtils', () => {
  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000/api')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
      expect(isValidUrl('https://sub.domain.co.uk/path?q=1#hash')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
      expect(isValidUrl('://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      // @ts-expect-error - testing invalid input
      expect(isValidUrl(null)).toBe(false);
    });
  });
});
