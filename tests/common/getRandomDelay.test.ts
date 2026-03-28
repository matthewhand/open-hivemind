import { getRandomDelay } from '../../src/common/getRandomDelay';

describe('getRandomDelay', () => {
  it('should return a value between min and max', () => {
    const result = getRandomDelay(100, 500);
    expect(result).toBeGreaterThanOrEqual(100);
    expect(result).toBeLessThanOrEqual(500);
  });

  it('should return 0 when min > max', () => {
    expect(getRandomDelay(500, 100)).toBe(0);
  });

  it('should return 0 when min is negative', () => {
    expect(getRandomDelay(-1, 100)).toBe(0);
  });

  it('should return 0 when max is negative', () => {
    expect(getRandomDelay(0, -5)).toBe(0);
  });

  it('should handle min === max', () => {
    const result = getRandomDelay(200, 200);
    expect(result).toBe(200);
  });

  it('should handle zero values', () => {
    const result = getRandomDelay(0, 0);
    expect(result).toBe(0);
  });

  it('should return varying results (randomness)', () => {
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomDelay(0, 10000));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
