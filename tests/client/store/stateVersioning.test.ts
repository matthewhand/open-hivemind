// Now import the module under test — it references localStorage at call time.
import {
  clearPersistedState,
  loadState,
  migrateState,
  migrations,
  PersistedEnvelope,
  saveState,
  STATE_VERSION,
} from '../../../src/client/src/store/stateVersioning';

/**
 * Tests for Redux state versioning and migration system.
 */

// Minimal localStorage polyfill for Node (jest runs in node for root config)
const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => storage[key] ?? null),
  setItem: jest.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete storage[key];
  }),
  clear: jest.fn(() => {
    for (const k of Object.keys(storage)) delete storage[k];
  }),
  get length() {
    return Object.keys(storage).length;
  },
  key: jest.fn((_i: number) => null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  migrations.clear();
});

describe('migrateState', () => {
  it('returns the state as-is when the version matches', () => {
    const envelope: PersistedEnvelope = { version: 1, state: { foo: 'bar' } };
    const result = migrateState(envelope, 1);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null for non-envelope input', () => {
    expect(migrateState('garbage', 1)).toBeNull();
    expect(migrateState(null, 1)).toBeNull();
    expect(migrateState(42, 1)).toBeNull();
  });

  it('returns null when persisted version is ahead of target', () => {
    const envelope: PersistedEnvelope = { version: 5, state: { x: 1 } };
    expect(migrateState(envelope, 3)).toBeNull();
  });

  it('runs migrations sequentially from old version to target', () => {
    migrations.set(1, (s) => ({ ...s, addedInV2: true }));
    migrations.set(2, (s) => ({ ...s, addedInV3: 'hello' }));

    const envelope: PersistedEnvelope = { version: 1, state: { original: true } };
    const result = migrateState(envelope, 3);

    expect(result).toEqual({
      original: true,
      addedInV2: true,
      addedInV3: 'hello',
    });
  });

  it('returns null when a migration in the chain is missing', () => {
    // Register v1->v2 but skip v2->v3
    migrations.set(1, (s) => ({ ...s, v2: true }));

    const envelope: PersistedEnvelope = { version: 1, state: {} };
    const result = migrateState(envelope, 3);

    expect(result).toBeNull();
  });
});

describe('saveState / loadState round-trip', () => {
  it('saves and loads state with the current version', () => {
    const state = { auth: { token: 'abc' }, ui: { theme: 'dark' } };
    saveState(state);

    const loaded = loadState();
    expect(loaded).toEqual(state);
  });

  it('returns null when nothing is persisted', () => {
    expect(loadState()).toBeNull();
  });

  it('returns null when localStorage contains invalid JSON', () => {
    storage['hivemind_redux_state'] = '{not json';
    expect(loadState()).toBeNull();
  });
});

describe('clearPersistedState', () => {
  it('removes the persisted state from localStorage', () => {
    saveState({ some: 'data' });
    expect(loadState()).not.toBeNull();

    clearPersistedState();
    expect(loadState()).toBeNull();
  });
});

describe('STATE_VERSION', () => {
  it('is a positive integer', () => {
    expect(typeof STATE_VERSION).toBe('number');
    expect(STATE_VERSION).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(STATE_VERSION)).toBe(true);
  });
});
