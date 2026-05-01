/**
 * Regression test for the regex-quantifier fixes shipped in PR #2636.
 *
 * The buggy regexes used `{N }` (whitespace inside the brace) which
 * JavaScript silently treats as a literal `{N }` match — never matching
 * anything quantified. Validation and log redaction silently broke.
 * PR #2636 corrected the patterns; this is the regression guard the
 * original commit forgot to add.
 *
 * Note: the original test file path
 * (`tests/unit/security/regex-quantifier-fixes.test.ts`) was added in a
 * staged commit but never landed on disk. This recreates coverage from
 * scratch, exercising the redaction path via the public
 * `sanitizeForLogging` export.
 */
import { sanitizeForLogging } from '../../../src/common/logger';

// `sanitizeForLogging(value)` with no `key` falls through to
// `sanitizeLooseString`, which is where the redaction regexes live.
const redact = (input: string): string => sanitizeForLogging(input) as string;

describe('Sensitive-info redaction (regex quantifier regressions)', () => {
  it('redacts `apiKey=...` style key/value pairs', () => {
    const out = redact('apiKey=sk-abcdef1234');
    expect(out).toMatch(/apiKey=\*+/);
    expect(out).not.toContain('sk-abcdef1234');
  });

  it('redacts `password: "..."` style', () => {
    const out = redact('password: hunter2');
    expect(out).toMatch(/password\s*=\s*\*+/);
    expect(out).not.toContain('hunter2');
  });

  it('redacts a Bearer token in an Authorization header string', () => {
    const out = redact('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');
    expect(out).toContain('Bearer ********');
    expect(out).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('redacts an `sk_*` style API key (no underscore separator)', () => {
    // GENERIC_TOKEN_REGEX matches /\b(sk|pk|rk|ak)_[A-Za-z0-9]{8,}\b/ — the
    // underscore is NOT in the character class, so test with a continuous
    // alphanumeric body (real Stripe live keys look like
    // `sk_live_4eC...` but the actual entropy block is uninterrupted).
    const out = redact('Using token sk_4eC39HqLyjWDarjtT1zdp7dc for the request');
    expect(out).toContain('********');
    expect(out).not.toContain('sk_4eC39HqLyjWDarjtT1zdp7dc');
  });

  it('redacts a `pk_*` style API key', () => {
    const out = redact('payment with pk_qwerty098765abcdef worked');
    expect(out).not.toContain('pk_qwerty098765abcdef');
  });

  it('does NOT redact a token shorter than 8 chars', () => {
    // The corrected quantifier is `{8,}`. A 3-char suffix should be left alone.
    const out = redact('short id sk_abc keep');
    expect(out).toContain('sk_abc');
  });

  it('redacts multiple occurrences in one string', () => {
    const out = redact('apiKey=AAA1234567 and authToken=BBB7654321');
    expect(out).not.toContain('AAA1234567');
    expect(out).not.toContain('BBB7654321');
  });

  it('handles an empty string without throwing', () => {
    expect(redact('')).toBe('');
  });

  it('returns plain text unchanged when no sensitive pattern is present', () => {
    const harmless = 'The cat sat on the mat at 12:34.';
    expect(redact(harmless)).toBe(harmless);
  });

  it('regex evaluation completes in linear time on long benign input (no ReDoS)', () => {
    const big = 'a'.repeat(100_000);
    const start = Date.now();
    redact(big);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
