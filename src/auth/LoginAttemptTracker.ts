/**
 * Account-lockout tracker for failed login attempts.
 *
 * Counts consecutive failed logins per key (typically `username` lowercased,
 * optionally combined with the client IP) and applies a temporary lockout once
 * a configurable threshold is reached. State is held in-memory and self-prunes:
 * entries are cleared on a successful login or once the lockout expires, so a
 * legitimate user is never permanently locked out.
 *
 * Thresholds are configurable via environment variables with safe defaults:
 *  - `AUTH_MAX_LOGIN_ATTEMPTS`      (default 5;  `<= 0` disables lockout)
 *  - `AUTH_LOCKOUT_DURATION_SECONDS`(default 900)
 *  - `AUTH_LOCKOUT_WINDOW_SECONDS`  (default 900) — window after which an
 *    isolated, non-locking failure count resets even without a success, so slow
 *    drip failures over hours never accumulate into a lockout.
 */
interface AttemptRecord {
  failures: number;
  lockedUntil: number;
  firstFailureAt: number;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class LoginAttemptTracker {
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts: number;
  private readonly lockoutDurationMs: number;
  private readonly attemptWindowMs: number;

  constructor(opts?: {
    maxAttempts?: number;
    lockoutDurationMs?: number;
    attemptWindowMs?: number;
  }) {
    this.maxAttempts = opts?.maxAttempts ?? readIntEnv('AUTH_MAX_LOGIN_ATTEMPTS', 5);
    this.lockoutDurationMs =
      opts?.lockoutDurationMs ?? readIntEnv('AUTH_LOCKOUT_DURATION_SECONDS', 900) * 1000;
    this.attemptWindowMs =
      opts?.attemptWindowMs ?? readIntEnv('AUTH_LOCKOUT_WINDOW_SECONDS', 900) * 1000;
  }

  /**
   * Build a tracking key. Username is lowercased to avoid trivial case-variation
   * bypass; the IP (when provided) scopes the counter so one abusive source
   * cannot lock a legitimate user out everywhere.
   */
  static buildKey(username: string, ipAddress?: string): string {
    const normalizedUser = (username || '').toLowerCase();
    return ipAddress ? `${normalizedUser}|${ipAddress}` : normalizedUser;
  }

  /** Whether lockout is enabled at all (threshold > 0). */
  get enabled(): boolean {
    return this.maxAttempts > 0;
  }

  /**
   * Remaining lockout time in milliseconds for the key, or 0 if not locked.
   * Expired locks are cleared lazily.
   */
  getLockRemainingMs(key: string): number {
    if (!this.enabled) return 0;
    const entry = this.attempts.get(key);
    if (!entry || entry.lockedUntil <= 0) return 0;
    const remaining = entry.lockedUntil - Date.now();
    if (remaining <= 0) {
      this.attempts.delete(key);
      return 0;
    }
    return remaining;
  }

  /**
   * Record a failed attempt and lock the key once the threshold is reached.
   * No-op when lockout is disabled.
   */
  recordFailure(key: string): void {
    if (!this.enabled) return;

    const now = Date.now();
    let entry = this.attempts.get(key);

    // Drop a stale counter so slow drip failures never accumulate to a lockout.
    if (entry && entry.lockedUntil <= 0 && now - entry.firstFailureAt > this.attemptWindowMs) {
      entry = undefined;
    }

    if (!entry) {
      entry = { failures: 0, lockedUntil: 0, firstFailureAt: now };
    }

    entry.failures += 1;
    if (entry.failures >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutDurationMs;
    }
    this.attempts.set(key, entry);
  }

  /** Clear all failure/lock state for a key (called on successful login). */
  clear(key: string): void {
    this.attempts.delete(key);
  }
}
