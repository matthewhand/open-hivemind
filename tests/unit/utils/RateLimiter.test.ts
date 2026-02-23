import { RateLimiter } from '../../../src/utils/InputSanitizer';

describe('RateLimiter', () => {
  beforeEach(() => {
    RateLimiter.clearAll();
    // Reset to defaults or something reasonable for other tests if we had them
    RateLimiter.configure({
      maxIdentifiers: 10000,
      maxAttemptsPerIdentifier: 100
    });
  });

  describe('configure', () => {
    it('should update configuration and respect new limits', () => {
      // Configure with small limits for testing
      RateLimiter.configure({
        maxIdentifiers: 3,
        maxAttemptsPerIdentifier: 5
      });

      // Add 4 identifiers
      RateLimiter.checkLimit('id1');
      RateLimiter.checkLimit('id2');
      RateLimiter.checkLimit('id3');
      RateLimiter.checkLimit('id4');

      // Verify stats
      const stats = RateLimiter.getStats();

      // logic trace:
      // max = 3. 10% = 0.3. ceil = 1.
      // id1 -> size 1
      // id2 -> size 2
      // id3 -> size 3. 3 < 3 False. Evict 1. Size 2. (id1 gone)
      // id4 -> size 3. 3 < 3 False. Evict 1. Size 2. (id2 gone)

      expect(stats.identifiersCount).toBe(2);
      expect(stats.maxIdentifiers).toBe(3);

      // Verify we can still add more
      expect(RateLimiter.checkLimit('id5')).toBe(true);
    });
  });
});
