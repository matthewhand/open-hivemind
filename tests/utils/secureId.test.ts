import { generateSecureId, generateTimestampedId } from '../../src/utils/secureId';

describe('Secure ID Generation', () => {
  describe('generateSecureId', () => {
    it('should generate a hex string of default length (10 chars)', () => {
      const id = generateSecureId();
      expect(id).toMatch(/^[0-9a-f]{10}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateSecureId()));
      expect(ids.size).toBe(100);
    });

    it('should respect custom length parameter', () => {
      const id = generateSecureId(8);
      expect(id).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('generateTimestampedId', () => {
    it('should generate ID with timestamp prefix', () => {
      const id = generateTimestampedId();
      expect(id).toMatch(/^[0-9a-z]+-[0-9a-f]{10}$/);
    });

    it('should generate unique IDs even when called rapidly', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTimestampedId()));
      expect(ids.size).toBe(100);
    });
  });
});
