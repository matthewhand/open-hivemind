import {
  cosineSimilarity,
  DEFAULT_RECENCY_HALF_LIFE_MS,
  hybridScore,
  recencyDecay,
} from './scoring';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it('returns ~0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('is scale-invariant', () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1, 6);
  });

  it('returns 0 when either vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe('recencyDecay', () => {
  const now = 1_000_000_000_000;

  it('returns 1 for a memory created now', () => {
    expect(recencyDecay(now, now)).toBe(1);
  });

  it('returns 1 for future timestamps (clock skew clamp)', () => {
    expect(recencyDecay(now + 5000, now)).toBe(1);
  });

  it('returns 0.5 at exactly one half-life', () => {
    expect(recencyDecay(now - DEFAULT_RECENCY_HALF_LIFE_MS, now)).toBeCloseTo(0.5, 6);
  });

  it('returns 0.25 at two half-lives', () => {
    expect(recencyDecay(now - 2 * DEFAULT_RECENCY_HALF_LIFE_MS, now)).toBeCloseTo(0.25, 6);
  });

  it('returns 0 for an undefined timestamp', () => {
    expect(recencyDecay(undefined, now)).toBe(0);
  });

  it('honours a custom half-life', () => {
    expect(recencyDecay(now - 1000, now, 1000)).toBeCloseTo(0.5, 6);
  });
});

describe('hybridScore', () => {
  const now = 1_000_000_000_000;

  it('combines similarity and recency with default 0.8/0.2 weights', () => {
    // similarity 1, brand-new memory -> 1*0.8 + 1*0.2 = 1
    expect(hybridScore(1, now, { now })).toBeCloseTo(1, 6);
  });

  it('weights vector similarity at 0.8 when recency has fully decayed', () => {
    // A very old memory -> recency ~ 0, so score ~ similarity * 0.8
    const veryOld = now - 100 * DEFAULT_RECENCY_HALF_LIFE_MS;
    expect(hybridScore(1, veryOld, { now })).toBeCloseTo(0.8, 4);
  });

  it('a fresh lower-similarity memory can outrank a stale higher-similarity one', () => {
    const fresh = hybridScore(0.7, now, { now });
    const stale = hybridScore(0.75, now - 100 * DEFAULT_RECENCY_HALF_LIFE_MS, { now });
    expect(fresh).toBeGreaterThan(stale);
  });

  it('honours custom weights', () => {
    const score = hybridScore(0.5, now, { now, vectorWeight: 0.5, recencyWeight: 0.5 });
    expect(score).toBeCloseTo(0.5 * 0.5 + 1 * 0.5, 6);
  });
});
