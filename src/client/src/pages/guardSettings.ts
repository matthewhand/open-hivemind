/**
 * Pure logic for the Guard Settings tab — kept separate from the React component
 * so it can be unit-tested without rendering. Mirrors the backend GuardSettings
 * shape served by GET/PUT /api/admin/guard-profiles/settings.
 */

export type GuardStrictness = 'low' | 'medium' | 'high';
export type GuardEvaluationOrder = 'sequential' | 'parallel' | 'fail-fast';

export interface GuardSettings {
  defaultRateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  defaultContentFilterStrictness: GuardStrictness;
  evaluationOrder: GuardEvaluationOrder;
}

export const DEFAULT_GUARD_SETTINGS: GuardSettings = {
  defaultRateLimit: { maxRequests: 100, windowMs: 60000 },
  defaultContentFilterStrictness: 'medium',
  evaluationOrder: 'sequential',
};

const STRICTNESS: GuardStrictness[] = ['low', 'medium', 'high'];
const ORDERS: GuardEvaluationOrder[] = ['sequential', 'parallel', 'fail-fast'];

/** Coerce a server response (which may be partial/garbage) into valid settings. */
export const coerceGuardSettings = (input: unknown): GuardSettings => {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const rl = (
    obj.defaultRateLimit && typeof obj.defaultRateLimit === 'object' ? obj.defaultRateLimit : {}
  ) as Record<string, unknown>;

  const maxRequests = Number(rl.maxRequests);
  const windowMs = Number(rl.windowMs);
  const strictness = obj.defaultContentFilterStrictness as GuardStrictness;
  const order = obj.evaluationOrder as GuardEvaluationOrder;

  return {
    defaultRateLimit: {
      maxRequests:
        Number.isFinite(maxRequests) && maxRequests >= 1
          ? Math.floor(maxRequests)
          : DEFAULT_GUARD_SETTINGS.defaultRateLimit.maxRequests,
      windowMs:
        Number.isFinite(windowMs) && windowMs >= 1000
          ? Math.floor(windowMs)
          : DEFAULT_GUARD_SETTINGS.defaultRateLimit.windowMs,
    },
    defaultContentFilterStrictness: STRICTNESS.includes(strictness)
      ? strictness
      : DEFAULT_GUARD_SETTINGS.defaultContentFilterStrictness,
    evaluationOrder: ORDERS.includes(order)
      ? order
      : DEFAULT_GUARD_SETTINGS.evaluationOrder,
  };
};

/**
 * Convert a UI window value in seconds into a settings object delta.
 * Clamps to [1, 3600] seconds, matching the per-profile editor's range.
 */
export const windowSecondsToMs = (seconds: number): number => {
  const clamped = Math.max(1, Math.min(3600, Math.floor(Number.isFinite(seconds) ? seconds : 1)));
  return clamped * 1000;
};

/** Clamp a max-requests value to the editor's supported range [1, 1000000]. */
export const clampMaxRequests = (value: number): number => {
  const n = Math.floor(Number.isFinite(value) ? value : 1);
  return Math.max(1, Math.min(1000000, n));
};

/** Human-readable label for a rate-limit window in milliseconds. */
export const formatWindow = (windowMs: number): string => {
  const seconds = Math.round(windowMs / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  if (seconds === 60) return '1 minute';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m} minutes` : `${m} min ${s}s`;
  }
  return '1 hour';
};

/** True when two settings objects are value-equal (used to disable the Save button). */
export const settingsEqual = (a: GuardSettings, b: GuardSettings): boolean =>
  a.defaultRateLimit.maxRequests === b.defaultRateLimit.maxRequests &&
  a.defaultRateLimit.windowMs === b.defaultRateLimit.windowMs &&
  a.defaultContentFilterStrictness === b.defaultContentFilterStrictness &&
  a.evaluationOrder === b.evaluationOrder;

/**
 * Semantic DaisyUI badge classes for guard chips.
 *
 * Protection level reads as *safety*, never danger: disabled/off chips are
 * neutral-ghost, low protection is warning (weak), medium is info, and high
 * is success (strongest). Binary guards (access control, rate limit) use a
 * success outline when enabled so "guard active" is consistently positive.
 */
export const guardChipClass = (enabled: boolean, level?: GuardStrictness | string): string => {
  if (!enabled) return 'badge-ghost';
  if (!level) return 'badge-success badge-outline';
  switch (level) {
    case 'low':
      return 'badge-warning';
    case 'high':
      return 'badge-success';
    case 'medium':
    default:
      return 'badge-info';
  }
};

/** Badge variant equivalent of {@link guardChipClass} for <Badge variant=...>. */
export const guardChipVariant = (
  enabled: boolean,
  level?: GuardStrictness | string
): 'ghost' | 'success' | 'warning' | 'info' => {
  if (!enabled) return 'ghost';
  if (!level) return 'success';
  switch (level) {
    case 'low':
      return 'warning';
    case 'high':
      return 'success';
    case 'medium':
    default:
      return 'info';
  }
};
