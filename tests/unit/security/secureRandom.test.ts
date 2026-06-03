import crypto from 'crypto';
import { secureRandom } from '../../../src/utils/secureRandom';

describe('secureRandom', () => {
  it('should return a number in [0, 1)', () => {
    // Run many iterations to ensure the range contract holds
    for (let i = 0; i < 1000; i++) {
      const value = secureRandom();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should return a number (type check)', () => {
    const value = secureRandom();
    expect(typeof value).toBe('number');
    expect(isFinite(value)).toBe(true);
  });

  it('should produce different values across calls', () => {
    const values = new Set<number>();
    for (let i = 0; i < 100; i++) {
      values.add(secureRandom());
    }
    // With 2^32 possible values, 100 calls should produce all unique values
    expect(values.size).toBe(100);
  });

  it('should never return exactly 1', () => {
    for (let i = 0; i < 10000; i++) {
      const value = secureRandom();
      expect(value).toBeLessThan(1);
    }
  });

  it('should never return exactly 0 in normal operation (possible but astronomically unlikely)', () => {
    // The range is [0, 1), so 0 is technically possible but we check that
    // the function doesn't have a bug that makes it always 0
    const values = Array.from({ length: 500 }, () => secureRandom());
    const nonZero = values.filter((v) => v > 0);
    expect(nonZero.length).toBe(500);
  });

  it('should produce output within Uint32 range', () => {
    // Verify the underlying implementation: getRandomValues on a single Uint32
    // produces [0, 2^32-1], divided by 2^32 gives [0, 1). Test the upper bound.
    for (let i = 0; i < 50000; i++) {
      const v = secureRandom();
      // Theoretical max is (2^32 - 1) / 2^32 ≈ 0.999999999767
      expect(v).toBeLessThan(1);
      // Should be able to produce values above 0.999
      if (v > 0.999) break; // Found one, test passes
    }
    // After 50k iterations we should have seen a value > 0.999
    const foundHighValue = Array.from({ length: 50000 }, () => secureRandom()).find(
      (v) => v > 0.999
    );
    expect(foundHighValue).toBeDefined();
  });

  it('should be evenly distributed (chi-squared style sanity check)', () => {
    const buckets = 10;
    const counts = new Array(buckets).fill(0);
    const iterations = 50000;

    for (let i = 0; i < iterations; i++) {
      const bucket = Math.floor(secureRandom() * buckets);
      counts[bucket]++;
    }

    // Each bucket should have roughly 5000 items. Allow 20% deviation.
    const expected = iterations / buckets;
    const maxDeviation = expected * 0.2;

    counts.forEach((count) => {
      expect(Math.abs(count - expected)).toBeLessThan(maxDeviation);
    });
  });
});
