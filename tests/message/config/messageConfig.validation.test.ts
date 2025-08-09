import Debug from 'debug';
import path from 'path';

// Ensure NODE_CONFIG_DIR points to our test configs; use existing test config dir if available
const ORIGINAL_ENV = { ...process.env };
const debug = Debug('test:messageConfigValidation');

function reloadMessageConfig() {
  // Delete from require cache to reload with fresh env
  const modPath = path.resolve('src/config/messageConfig.ts');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const resolved = require.resolve(modPath);
  delete require.cache[resolved];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(modPath).default;
}

describe('messageConfig validation and normalization', () => {
  beforeEach(() => {
    // Reset env and set a config dir that exists in repo
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('CHANNEL_') || k.startsWith('MESSAGE_') || k === 'NODE_CONFIG_DIR') {
        delete process.env[k];
      }
    }
    // Point to config/test if present; fallback to ./config
    process.env.NODE_CONFIG_DIR = './config/test/';
  });

  afterEach(() => {
    // Restore env to avoid cross-test pollution
    Object.assign(process.env, ORIGINAL_ENV);
  });

  test('CSV env: bonuses and priorities are parsed; bonuses clamped to [0,2]; priorities coerced to integers ≥0', () => {
    process.env.CHANNEL_BONUSES = 'A: -1, B: 0.5, C: 2.5, D: 1';
    process.env.CHANNEL_PRIORITIES = 'A: -3, B: 1.8, C: 2, D: foo';

    const messageConfig = reloadMessageConfig();

    const bonuses = messageConfig.get('CHANNEL_BONUSES') as Record<string, number>;
    const priorities = messageConfig.get('CHANNEL_PRIORITIES') as Record<string, number>;

    expect(bonuses).toEqual({
      A: 0,      // clamped from -1
      B: 0.5,
      C: 2,      // clamped from 2.5
      D: 1
    });
    // priorities: -3 -> 0, 1.8 -> 1, 2 -> 2, 'foo' -> NaN -> coerced to 0
    expect(priorities).toEqual({
      A: 0,
      B: 1,
      C: 2,
      D: 0
    });
  });

  test('JSON env: strict JSON parsing is enforced for bonuses and priorities', () => {
    process.env.CHANNEL_BONUSES = '{ "X": 1, "Y": 3 }'; // Y will be clamped to 2 on coerce
    process.env.CHANNEL_PRIORITIES = '{ "X": 0, "Y": 2 }';

    const messageConfig = reloadMessageConfig();

    const bonuses = messageConfig.get('CHANNEL_BONUSES') as Record<string, number>;
    const priorities = messageConfig.get('CHANNEL_PRIORITIES') as Record<string, number>;

    expect(bonuses).toEqual({ X: 1, Y: 2 }); // clamped
    expect(priorities).toEqual({ X: 0, Y: 2 });
  });

  test('Malformed JSON env throws during load/validate', () => {
    process.env.CHANNEL_BONUSES = '{ "X": 1, '; // malformed JSON
    // Reset module cache to capture throw from strict JSON during format validation/coerce
    expect(() => reloadMessageConfig()).toThrow(/Invalid JSON|Unexpected end of JSON input|Expected JSON object/);
  });

  test('Unknown channel ids are warned (debug), but retained', () => {
    // We cannot intercept debug output easily without altering global state,
    // but we can at least ensure unknown channels remain present post-normalization.
    process.env.CHANNEL_BONUSES = 'unknown-1: 1.5';
    process.env.CHANNEL_PRIORITIES = 'unknown-2: 3';

    const messageConfig = reloadMessageConfig();

    const bonuses = messageConfig.get('CHANNEL_BONUSES') as Record<string, number>;
    const priorities = messageConfig.get('CHANNEL_PRIORITIES') as Record<string, number>;

    expect(bonuses).toHaveProperty('unknown-1', 1.5);
    expect(priorities).toHaveProperty('unknown-2', 3);
    // Note: The actual debug warning "includes unknown channel id" is produced in normalizeChannelMaps,
    // which is invoked after validate(); we rely on logger behavior, not asserting its text here.
    debug('bonuses=%o priorities=%o', bonuses, priorities);
  });

  test('Object inputs from file config are normalized identically (no env)', () => {
    // Ensure no env maps; rely on config file defaults (empty) plus normalization idempotency
    const messageConfig = reloadMessageConfig();
    const bonuses = messageConfig.get('CHANNEL_BONUSES') as Record<string, number>;
    const priorities = messageConfig.get('CHANNEL_PRIORITIES') as Record<string, number>;

    // Defaults to empty objects; normalization should keep them as empty
    expect(bonuses).toEqual({});
    expect(priorities).toEqual({});
  });
});