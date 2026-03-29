/**
 * Redux State Versioning & Migration System
 *
 * Provides versioned persistence of Redux state to localStorage with
 * sequential migrations when the schema changes.
 */

import { logger } from '../utils/logger';

/** Bump this whenever the persisted state shape changes in a breaking way. */
export const STATE_VERSION = 1;

const STORAGE_KEY = 'hivemind_redux_state';

// ---------------------------------------------------------------------------
// Migration registry
// ---------------------------------------------------------------------------

export type MigrationFn = (oldState: Record<string, unknown>) => Record<string, unknown>;

/**
 * Map from *source* version to a function that migrates state to the next
 * version. For example, migrations.get(1) upgrades v1 -> v2.
 */
export const migrations: Map<number, MigrationFn> = new Map();

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

export interface PersistedEnvelope {
  version: number;
  state: Record<string, unknown>;
}

function isPersistedEnvelope(value: unknown): value is PersistedEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PersistedEnvelope).version === 'number' &&
    typeof (value as PersistedEnvelope).state === 'object' &&
    (value as PersistedEnvelope).state !== null
  );
}

/**
 * Run every migration from `fromVersion` up to (but not including)
 * `targetVersion` sequentially. Returns the fully migrated state or `null`
 * if a required migration is missing (caller should fall back to fresh state).
 */
export function migrateState(
  persisted: unknown,
  targetVersion: number,
): Record<string, unknown> | null {
  if (!isPersistedEnvelope(persisted)) {
    return null;
  }

  const { version: fromVersion, state } = persisted;

  if (fromVersion === targetVersion) {
    return state;
  }

  // If the persisted version is ahead of what we know, reset.
  if (fromVersion > targetVersion) {
    return null;
  }

  let current = state;
  for (let v = fromVersion; v < targetVersion; v++) {
    const migration = migrations.get(v);
    if (!migration) {
      // Missing migration — cannot upgrade safely.
      logger.warn(
        `[stateVersioning] Missing migration from v${v} to v${v + 1}. Resetting state.`,
      );
      return null;
    }
    current = migration(current);
  }

  return current;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/** Save state to localStorage wrapped in a versioned envelope. */
export function saveState(state: Record<string, unknown>): void {
  try {
    const envelope: PersistedEnvelope = {
      version: STATE_VERSION,
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (err) {
    logger.error('[stateVersioning] Failed to save state:', err);
  }
}

/**
 * Load and migrate persisted state. Returns `null` when there is nothing
 * persisted or the data cannot be migrated (caller should use fresh state).
 */
export function loadState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return migrateState(parsed, STATE_VERSION);
  } catch (err) {
    logger.error('[stateVersioning] Failed to load state:', err);
    return null;
  }
}

/** Remove persisted state entirely (useful after hydration errors). */
export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Swallow — localStorage might be unavailable.
  }
}
