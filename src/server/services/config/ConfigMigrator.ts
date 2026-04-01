/**
 * ConfigMigrator
 *
 * Handles version-to-version schema migrations for imported configuration
 * data.  When an import file was created by an older version of the
 * application this module is responsible for transforming it to the current
 * schema before it is persisted.
 *
 * The current codebase does not yet define explicit version migrations; this
 * module serves as the designated home for that logic and exposes a stable API
 * so that callers do not need to change when migrations are added.
 */

import Debug from 'debug';

const debug = Debug('app:ConfigMigrator');

/** Minimum metadata shape expected on every import payload. */
export interface ImportMetadata {
  version?: string | number;
  [key: string]: unknown;
}

/**
 * Migrate an import payload from its declared version to the current schema.
 *
 * If no migrations are required for the given version the payload is returned
 * unchanged.
 *
 * @param payload  The raw parsed import data (configurations, versions, etc.)
 * @returns        The (possibly transformed) payload ready for import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateImportPayload(payload: any): any {
  const version = payload?.metadata?.version;

  if (!version) {
    debug('No version found in import metadata – assuming current schema');
    return payload;
  }

  debug(`Import payload version: ${version} – no migrations required`);
  // Future migrations will be applied here, e.g.:
  //   if (semver.lt(String(version), '2.0.0')) payload = migrateV1toV2(payload);
  return payload;
}
