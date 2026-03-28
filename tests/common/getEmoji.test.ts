import { getEmoji } from '../../src/common/getEmoji';

describe('getEmoji', () => {
  it('should return a string', () => {
    const result = getEmoji();
    expect(typeof result).toBe('string');
  });

  it('should return a non-empty string', () => {
    const result = getEmoji();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return different emojis over many calls (randomness check)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(getEmoji());
    }
    // With 16 emojis, 100 calls should yield at least 2 distinct values
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});
