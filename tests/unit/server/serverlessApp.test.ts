import { applyServerlessEnvDefaults } from '@src/server/serverlessApp';

const MANAGED_KEYS = [
  'SKIP_MESSENGERS',
  'DEMO_MODE',
  'ANOMALY_DETECTION_ENABLED',
  'DISABLE_INTEGRATION_ANOMALY',
  'DATABASE_PATH',
  'HTTP_ALLOW_ALL_IPS',
  'SESSION_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

describe('applyServerlessEnvDefaults', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of MANAGED_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  it('applies stateless demo-mode defaults when nothing is configured', () => {
    applyServerlessEnvDefaults();

    expect(process.env.SKIP_MESSENGERS).toBe('true');
    expect(process.env.DEMO_MODE).toBe('true');
    expect(process.env.ANOMALY_DETECTION_ENABLED).toBe('false');
    expect(process.env.DISABLE_INTEGRATION_ANOMALY).toBe('true');
    expect(process.env.DATABASE_PATH).toBe('/tmp/hivemind.db');
    expect(process.env.HTTP_ALLOW_ALL_IPS).toBe('true');
  });

  it('generates ephemeral secrets of at least 32 characters when unset', () => {
    applyServerlessEnvDefaults();

    for (const key of ['SESSION_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      expect(process.env[key]).toBeDefined();
      expect(process.env[key]!.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('respects explicitly configured values', () => {
    const secret = 's'.repeat(40);
    process.env.SKIP_MESSENGERS = 'false';
    process.env.DEMO_MODE = 'false';
    process.env.DATABASE_PATH = '/var/data/custom.db';
    process.env.SESSION_SECRET = secret;

    applyServerlessEnvDefaults();

    expect(process.env.SKIP_MESSENGERS).toBe('false');
    expect(process.env.DEMO_MODE).toBe('false');
    expect(process.env.DATABASE_PATH).toBe('/var/data/custom.db');
    expect(process.env.SESSION_SECRET).toBe(secret);
  });

  it('replaces too-short secrets so production checks cannot fail the boot', () => {
    process.env.JWT_SECRET = 'short';

    applyServerlessEnvDefaults();

    expect(process.env.JWT_SECRET).not.toBe('short');
    expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
  });
});
