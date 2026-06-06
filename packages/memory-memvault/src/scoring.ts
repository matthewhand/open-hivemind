/**
 * Hybrid scoring primitives for the MemVault memory backend.
 *
 * MemVault ranks candidate memories by combining semantic relevance with
 * temporal freshness, mirroring the design documented in the project's
 * IMPROVEMENT_ROADMAP:
 *
 *     score = (vector similarity × VECTOR_WEIGHT)
 *           + (recency decay     × RECENCY_WEIGHT)
 *
 * The two weights sum to 1 so the resulting score stays within the same
 * [0, 1] range as a pure cosine similarity, which keeps `threshold`
 * filtering intuitive for callers.
 */

/** Default weight applied to vector (semantic) similarity. */
export const DEFAULT_VECTOR_WEIGHT = 0.8;

/** Default weight applied to the recency-decay term. */
export const DEFAULT_RECENCY_WEIGHT = 0.2;

/**
 * Default half-life for recency decay, in milliseconds (7 days).
 *
 * A memory that is exactly one half-life old contributes a recency term of
 * 0.5; older memories decay exponentially toward 0.
 */
export const DEFAULT_RECENCY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compute the cosine similarity between two equal-length vectors.
 *
 * Returns a value in the range [-1, 1]; for the non-negative embedding
 * spaces typically produced by LLM providers this lands in [0, 1].
 *
 * @throws RangeError when the vectors have differing lengths.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new RangeError(`cosineSimilarity: vector length mismatch (${a.length} !== ${b.length})`);
  }
  if (a.length === 0) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Compute an exponential recency-decay factor in the range (0, 1].
 *
 * A memory created `now` yields 1; one created exactly `halfLifeMs` ago
 * yields 0.5; older memories decay toward 0. Future timestamps (clock skew)
 * are clamped to 1.
 *
 * @param timestamp  Memory creation time in epoch milliseconds.
 * @param now        Reference time in epoch milliseconds (defaults to Date.now()).
 * @param halfLifeMs Decay half-life in milliseconds.
 */
export function recencyDecay(
  timestamp: number | undefined,
  now: number = Date.now(),
  halfLifeMs: number = DEFAULT_RECENCY_HALF_LIFE_MS
): number {
  if (timestamp == null || !Number.isFinite(timestamp)) {
    // Unknown age contributes no recency boost.
    return 0;
  }
  if (halfLifeMs <= 0) {
    return 1;
  }
  const ageMs = now - timestamp;
  if (ageMs <= 0) {
    return 1;
  }
  return Math.pow(2, -ageMs / halfLifeMs);
}

/** Tunable weights and decay parameters for {@link hybridScore}. */
export interface HybridScoreOptions {
  vectorWeight?: number;
  recencyWeight?: number;
  now?: number;
  halfLifeMs?: number;
}

/**
 * Combine a vector-similarity score with a recency-decay term into a single
 * hybrid relevance score.
 *
 * @param similarity Cosine similarity of the candidate (typically [0, 1]).
 * @param timestamp  Candidate creation time in epoch milliseconds.
 * @param options    Weight/decay overrides.
 */
export function hybridScore(
  similarity: number,
  timestamp: number | undefined,
  options: HybridScoreOptions = {}
): number {
  const vectorWeight = options.vectorWeight ?? DEFAULT_VECTOR_WEIGHT;
  const recencyWeight = options.recencyWeight ?? DEFAULT_RECENCY_WEIGHT;
  const recency = recencyDecay(timestamp, options.now, options.halfLifeMs);
  return similarity * vectorWeight + recency * recencyWeight;
}
