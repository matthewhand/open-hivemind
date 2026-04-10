/**
 * Cryptographically-safe identifier and jitter utilities.
 *
 * All functions in this module use Node's `crypto` module (or the Web Crypto
 * API in browser contexts) so they are safe for use in security-sensitive
 * paths such as token generation, timer IDs, and nonce values.
 *
 * Do NOT use `Math.random()` for these purposes — it is a pseudorandom
 * number generator seeded at startup and is not suitable for unpredictable IDs.
 */

import { randomUUID, randomBytes, randomInt } from 'crypto';

/**
 * Generate a URL-safe, cryptographically-random identifier.
 *
 * @param byteLength Number of random bytes before base64url encoding.
 *   Defaults to 16 (128 bits), giving a 22-character string.
 *   Use ≥ 16 for session tokens; 8 is fine for non-security timer keys.
 */
export function randomId(byteLength = 16): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Generate a UUID v4 using `crypto.randomUUID()`.
 * Prefer this when interoperability with UUID parsers is required.
 */
export function randomUuid(): string {
  return randomUUID();
}

/**
 * Cryptographically-safe jitter for exponential-backoff delays.
 *
 * Returns a random integer in [0, maxMs). Replaces `Math.random() * maxMs`
 * in retry loops where timing unpredictability matters (e.g. to avoid
 * thundering-herd collisions in a multi-process deployment).
 */
export function cryptoJitter(maxMs: number): number {
  if (maxMs <= 0) return 0;
  return randomInt(0, maxMs);
}
