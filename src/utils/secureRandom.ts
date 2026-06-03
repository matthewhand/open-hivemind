import crypto from 'crypto';

/** Cryptographically secure replacement for Math.random(). Returns a number in [0, 1). */
export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
}
