import { describe, it, expect } from 'vitest';
import {
  coerceGuardSettings,
  settingsEqual,
  windowSecondsToMs,
  clampMaxRequests,
  formatWindow,
  DEFAULT_GUARD_SETTINGS,
  type GuardSettings,
} from './guardSettings';

describe('guardSettings logic', () => {
  describe('coerceGuardSettings', () => {
    it('returns defaults for non-object input', () => {
      expect(coerceGuardSettings(null)).toEqual(DEFAULT_GUARD_SETTINGS);
      expect(coerceGuardSettings(undefined)).toEqual(DEFAULT_GUARD_SETTINGS);
      expect(coerceGuardSettings('garbage')).toEqual(DEFAULT_GUARD_SETTINGS);
    });

    it('preserves valid values', () => {
      const input = {
        defaultRateLimit: { maxRequests: 25, windowMs: 30000 },
        defaultContentFilterStrictness: 'high',
        evaluationOrder: 'fail-fast',
      };
      expect(coerceGuardSettings(input)).toEqual(input);
    });

    it('falls back per-field for invalid values', () => {
      const result = coerceGuardSettings({
        defaultRateLimit: { maxRequests: -5, windowMs: 10 },
        defaultContentFilterStrictness: 'extreme',
        evaluationOrder: 'random',
      });
      expect(result.defaultRateLimit.maxRequests).toBe(
        DEFAULT_GUARD_SETTINGS.defaultRateLimit.maxRequests
      );
      // windowMs < 1000 is rejected
      expect(result.defaultRateLimit.windowMs).toBe(
        DEFAULT_GUARD_SETTINGS.defaultRateLimit.windowMs
      );
      expect(result.defaultContentFilterStrictness).toBe('medium');
      expect(result.evaluationOrder).toBe('sequential');
    });

    it('floors fractional numbers', () => {
      const result = coerceGuardSettings({
        defaultRateLimit: { maxRequests: 12.9, windowMs: 5500.7 },
      });
      expect(result.defaultRateLimit.maxRequests).toBe(12);
      expect(result.defaultRateLimit.windowMs).toBe(5500);
    });
  });

  describe('windowSecondsToMs', () => {
    it('clamps to the [1, 3600] second range and converts to ms', () => {
      expect(windowSecondsToMs(60)).toBe(60000);
      expect(windowSecondsToMs(0)).toBe(1000);
      expect(windowSecondsToMs(-10)).toBe(1000);
      expect(windowSecondsToMs(99999)).toBe(3600000);
      expect(windowSecondsToMs(NaN)).toBe(1000);
    });
  });

  describe('clampMaxRequests', () => {
    it('clamps to [1, 1000000]', () => {
      expect(clampMaxRequests(50)).toBe(50);
      expect(clampMaxRequests(0)).toBe(1);
      expect(clampMaxRequests(-3)).toBe(1);
      expect(clampMaxRequests(9999999)).toBe(1000000);
      expect(clampMaxRequests(NaN)).toBe(1);
    });
  });

  describe('formatWindow', () => {
    it('formats sub-minute windows', () => {
      expect(formatWindow(1000)).toBe('1 second');
      expect(formatWindow(30000)).toBe('30 seconds');
    });
    it('formats minute boundaries', () => {
      expect(formatWindow(60000)).toBe('1 minute');
      expect(formatWindow(150000)).toBe('2 min 30s');
      expect(formatWindow(120000)).toBe('2 minutes');
    });
    it('formats an hour', () => {
      expect(formatWindow(3600000)).toBe('1 hour');
    });
  });

  describe('settingsEqual', () => {
    const base: GuardSettings = {
      defaultRateLimit: { maxRequests: 100, windowMs: 60000 },
      defaultContentFilterStrictness: 'medium',
      evaluationOrder: 'sequential',
    };

    it('is true for value-equal objects', () => {
      expect(settingsEqual(base, { ...base, defaultRateLimit: { ...base.defaultRateLimit } })).toBe(
        true
      );
    });

    it('detects every changed field', () => {
      expect(
        settingsEqual(base, {
          ...base,
          defaultRateLimit: { ...base.defaultRateLimit, maxRequests: 99 },
        })
      ).toBe(false);
      expect(
        settingsEqual(base, {
          ...base,
          defaultRateLimit: { ...base.defaultRateLimit, windowMs: 30000 },
        })
      ).toBe(false);
      expect(settingsEqual(base, { ...base, defaultContentFilterStrictness: 'high' })).toBe(false);
      expect(settingsEqual(base, { ...base, evaluationOrder: 'parallel' })).toBe(false);
    });
  });
});
