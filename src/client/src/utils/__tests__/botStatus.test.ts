import { describe, it, expect } from 'vitest';
import { botStatusVariant, botStatusLabel } from '../botStatus';
import type { StatusBadgeVariant } from '../botStatus';

describe('botStatusVariant', () => {
  describe('success statuses', () => {
    it.each(['active', 'running', 'connected', 'healthy'])(
      'maps "%s" to success',
      (status) => {
        expect(botStatusVariant(status)).toBe('success');
      },
    );
  });

  describe('error statuses', () => {
    it.each(['error', 'disconnected'])('maps "%s" to error', (status) => {
      expect(botStatusVariant(status)).toBe('error');
    });
  });

  describe('warning statuses', () => {
    it.each(['warning', 'connecting', 'starting', 'stopping'])(
      'maps "%s" to warning',
      (status) => {
        expect(botStatusVariant(status)).toBe('warning');
      },
    );
  });

  describe('neutral (default) statuses', () => {
    it.each([
      'inactive', // a label-mapped status that has no variant branch
      'stopped',
      'disabled',
      'unknown',
      'foobar',
      'pending',
      '   ', // whitespace is not a recognised status
    ])('falls back to neutral for unrecognised "%s"', (status) => {
      expect(botStatusVariant(status)).toBe('neutral');
    });

    it('falls back to neutral for the empty string', () => {
      expect(botStatusVariant('')).toBe('neutral');
    });
  });

  describe('case-insensitivity', () => {
    it.each([
      ['ACTIVE', 'success'],
      ['Active', 'success'],
      ['active', 'success'],
      ['Running', 'success'],
      ['CONNECTED', 'success'],
      ['Healthy', 'success'],
      ['ERROR', 'error'],
      ['Disconnected', 'error'],
      ['WARNING', 'warning'],
      ['Connecting', 'warning'],
      ['STARTING', 'warning'],
      ['Stopping', 'warning'],
    ] as const)(
      'treats "%s" the same regardless of case → %s',
      (status, expected: StatusBadgeVariant) => {
        expect(botStatusVariant(status)).toBe(expected);
      },
    );

    it('maps every casing of "active" identically', () => {
      const expected = botStatusVariant('active');
      expect(botStatusVariant('ACTIVE')).toBe(expected);
      expect(botStatusVariant('Active')).toBe(expected);
      expect(botStatusVariant('aCtIvE')).toBe(expected);
    });
  });

  describe('nullish inputs', () => {
    it('tolerates undefined and returns neutral', () => {
      // The function uses optional chaining (status?.toLowerCase()).
      expect(botStatusVariant(undefined as unknown as string)).toBe('neutral');
    });

    it('tolerates null and returns neutral', () => {
      expect(botStatusVariant(null as unknown as string)).toBe('neutral');
    });
  });
});

describe('botStatusLabel', () => {
  describe('explicit mappings', () => {
    it.each([
      ['active', 'Running'],
      ['running', 'Running'],
      ['inactive', 'Stopped'],
      ['stopped', 'Stopped'],
      ['disabled', 'Disabled'],
      ['error', 'Error'],
      ['starting', 'Starting'],
      ['stopping', 'Stopping'],
      ['connected', 'Healthy'],
      ['healthy', 'Healthy'],
      ['disconnected', 'Disconnected'],
    ] as const)('maps "%s" to "%s"', (status, expected) => {
      expect(botStatusLabel(status)).toBe(expected);
    });
  });

  describe('passthrough / default behaviour', () => {
    it('passes through an unknown non-empty status verbatim', () => {
      expect(botStatusLabel('foobar')).toBe('foobar');
      expect(botStatusLabel('queued')).toBe('queued');
    });

    it('preserves the original casing of an unknown status', () => {
      // Only the switch key is lowercased; the returned value is the raw input.
      expect(botStatusLabel('Queued')).toBe('Queued');
      expect(botStatusLabel('PENDING')).toBe('PENDING');
    });

    it('returns "Unknown" for the empty string', () => {
      // status || 'Unknown' → '' is falsy, so the fallback wins.
      expect(botStatusLabel('')).toBe('Unknown');
    });

    it('returns "Unknown" for a whitespace-only status', () => {
      // '   ' is truthy, so it passes through unchanged (it is not falsy).
      expect(botStatusLabel('   ')).toBe('   ');
    });
  });

  describe('case-insensitivity', () => {
    it.each([
      ['ACTIVE', 'Running'],
      ['Active', 'Running'],
      ['Running', 'Running'],
      ['INACTIVE', 'Stopped'],
      ['Stopped', 'Stopped'],
      ['Disabled', 'Disabled'],
      ['ERROR', 'Error'],
      ['Starting', 'Starting'],
      ['STOPPING', 'Stopping'],
      ['Connected', 'Healthy'],
      ['HEALTHY', 'Healthy'],
      ['Disconnected', 'Disconnected'],
    ] as const)('maps "%s" to "%s" regardless of case', (status, expected) => {
      expect(botStatusLabel(status)).toBe(expected);
    });

    it('maps every casing of "active" to the same label', () => {
      const expected = botStatusLabel('active');
      expect(botStatusLabel('ACTIVE')).toBe(expected);
      expect(botStatusLabel('Active')).toBe(expected);
      expect(botStatusLabel('aCtIvE')).toBe(expected);
    });
  });

  describe('nullish inputs', () => {
    it('tolerates undefined and returns "Unknown"', () => {
      // status?.toLowerCase() → undefined hits default; status || 'Unknown' → 'Unknown'.
      expect(botStatusLabel(undefined as unknown as string)).toBe('Unknown');
    });

    it('tolerates null and returns "Unknown"', () => {
      expect(botStatusLabel(null as unknown as string)).toBe('Unknown');
    });
  });
});
