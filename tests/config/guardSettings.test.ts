import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  DEFAULT_GUARD_SETTINGS,
  normalizeGuardSettings,
  loadGuardSettings,
  saveGuardSettings,
  type GuardSettings,
} from '@src/config/guardSettings';

describe('guardSettings config module', () => {
  let tmpDir: string;
  let prevConfigDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-settings-'));
    prevConfigDir = process.env.NODE_CONFIG_DIR;
    process.env.NODE_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    if (prevConfigDir === undefined) {
      delete process.env.NODE_CONFIG_DIR;
    } else {
      process.env.NODE_CONFIG_DIR = prevConfigDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('normalizeGuardSettings', () => {
    it('returns defaults for non-object input', () => {
      expect(normalizeGuardSettings(null)).toEqual(DEFAULT_GUARD_SETTINGS);
      expect(normalizeGuardSettings('nope')).toEqual(DEFAULT_GUARD_SETTINGS);
    });

    it('preserves valid values', () => {
      const input: GuardSettings = {
        defaultRateLimit: { maxRequests: 42, windowMs: 30000 },
        defaultContentFilterStrictness: 'high',
        evaluationOrder: 'fail-fast',
      };
      expect(normalizeGuardSettings(input)).toEqual(input);
    });

    it('falls back per-field for invalid values', () => {
      const result = normalizeGuardSettings({
        defaultRateLimit: { maxRequests: 0, windowMs: 500 },
        defaultContentFilterStrictness: 'nuclear',
        evaluationOrder: 'sideways',
      });
      expect(result.defaultRateLimit.maxRequests).toBe(
        DEFAULT_GUARD_SETTINGS.defaultRateLimit.maxRequests
      );
      expect(result.defaultRateLimit.windowMs).toBe(
        DEFAULT_GUARD_SETTINGS.defaultRateLimit.windowMs
      );
      expect(result.defaultContentFilterStrictness).toBe('medium');
      expect(result.evaluationOrder).toBe('sequential');
    });
  });

  describe('load/save round trip', () => {
    it('scaffolds defaults when no file exists', () => {
      const settings = loadGuardSettings();
      expect(settings).toEqual(DEFAULT_GUARD_SETTINGS);
      // Scaffolding should have written the file
      expect(fs.existsSync(path.join(tmpDir, 'guard-settings.json'))).toBe(true);
    });

    it('persists and reloads normalized settings', () => {
      const saved = saveGuardSettings({
        defaultRateLimit: { maxRequests: 7, windowMs: 120000 },
        defaultContentFilterStrictness: 'high',
        evaluationOrder: 'parallel',
      });
      expect(saved.defaultRateLimit.maxRequests).toBe(7);

      const reloaded = loadGuardSettings();
      expect(reloaded).toEqual({
        defaultRateLimit: { maxRequests: 7, windowMs: 120000 },
        defaultContentFilterStrictness: 'high',
        evaluationOrder: 'parallel',
      });
    });

    it('normalizes corrupt on-disk data on load', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'guard-settings.json'),
        JSON.stringify({ defaultRateLimit: { maxRequests: -1 }, evaluationOrder: 'bogus' }),
        'utf8'
      );
      const reloaded = loadGuardSettings();
      expect(reloaded.defaultRateLimit.maxRequests).toBe(
        DEFAULT_GUARD_SETTINGS.defaultRateLimit.maxRequests
      );
      expect(reloaded.evaluationOrder).toBe('sequential');
    });
  });
});
