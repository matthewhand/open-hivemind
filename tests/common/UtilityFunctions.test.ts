import { getEmoji } from '../../src/common/getEmoji';
import { getRandomDelay } from '../../src/common/getRandomDelay';

describe('Utility Functions', () => {
  describe('getRandomDelay', () => {
    it('should return a number between min and max (inclusive)', () => {
      const min = 10;
      const max = 20;
      for (let i = 0; i < 100; i++) {
        const result = getRandomDelay(min, max);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
      }
    });

    it('should return an integer', () => {
      const result = getRandomDelay(10, 20);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should work when min and max are equal', () => {
      expect(getRandomDelay(5, 5)).toBe(5);
    });

    it('should handle edge cases (negative values)', () => {
      // Assuming it returns 0 for invalid ranges based on previous file observation
      expect(getRandomDelay(-10, 10)).toBe(0);
      expect(getRandomDelay(10, 5)).toBe(0);
    });
  });

  describe('getEmoji', () => {
    it('should return an emoji for common keywords', () => {
      expect(getEmoji('success')).toBe('✅');
      expect(getEmoji('error')).toBe('❌');
      expect(getEmoji('warning')).toBe('⚠️');
    });

    it('should return a default emoji for unknown keywords', () => {
      expect(getEmoji('unknown-keyword-abc')).toBe('🤖');
    });

    it('should be case-insensitive', () => {
      expect(getEmoji('SUCCESS')).toBe('✅');
      expect(getEmoji('Error')).toBe('❌');
    });
  });
});
