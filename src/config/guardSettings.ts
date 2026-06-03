import { loadProfiles, saveProfiles } from './profileUtils';

/**
 * Global guard defaults applied to newly created guard profiles.
 * Persisted alongside the guardrail profiles via the same JSON-file mechanism.
 */
export interface GuardSettings {
  /** Default rate limit applied to new guard profiles. */
  defaultRateLimit: {
    maxRequests: number;
    windowMs: number;
  };
  /** Default content-filter strictness applied to new guard profiles. */
  defaultContentFilterStrictness: 'low' | 'medium' | 'high';
  /** Order in which guards are evaluated. */
  evaluationOrder: 'sequential' | 'parallel' | 'fail-fast';
}

export const DEFAULT_GUARD_SETTINGS: GuardSettings = {
  defaultRateLimit: {
    maxRequests: 100,
    windowMs: 60000,
  },
  defaultContentFilterStrictness: 'medium',
  evaluationOrder: 'sequential',
};

const STRICTNESS_VALUES: GuardSettings['defaultContentFilterStrictness'][] = [
  'low',
  'medium',
  'high',
];
const EVALUATION_ORDER_VALUES: GuardSettings['evaluationOrder'][] = [
  'sequential',
  'parallel',
  'fail-fast',
];

/**
 * Coerce arbitrary parsed JSON into a well-formed GuardSettings object,
 * falling back to defaults for any missing or invalid field.
 */
export const normalizeGuardSettings = (parsed: unknown): GuardSettings => {
  const input = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const rateLimit = (
    input.defaultRateLimit && typeof input.defaultRateLimit === 'object'
      ? input.defaultRateLimit
      : {}
  ) as Record<string, unknown>;

  const maxRequests = Number(rateLimit.maxRequests);
  const windowMs = Number(rateLimit.windowMs);
  const strictness = input.defaultContentFilterStrictness as GuardSettings['defaultContentFilterStrictness'];
  const order = input.evaluationOrder as GuardSettings['evaluationOrder'];

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
    defaultContentFilterStrictness: STRICTNESS_VALUES.includes(strictness)
      ? strictness
      : DEFAULT_GUARD_SETTINGS.defaultContentFilterStrictness,
    evaluationOrder: EVALUATION_ORDER_VALUES.includes(order)
      ? order
      : DEFAULT_GUARD_SETTINGS.evaluationOrder,
  };
};

export const loadGuardSettings = (): GuardSettings => {
  return loadProfiles<GuardSettings>({
    filename: 'guard-settings.json',
    defaultData: DEFAULT_GUARD_SETTINGS,
    profileType: 'guard-settings',
    validateAndMigrate: normalizeGuardSettings,
  });
};

export const saveGuardSettings = (settings: GuardSettings): GuardSettings => {
  const normalized = normalizeGuardSettings(settings);
  saveProfiles('guard-settings.json', normalized);
  return normalized;
};
