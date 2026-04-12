import { readFileSync } from 'fs';
import path from 'path';

/**
 * Guard: the lockfile must contain only one minimatch major version.
 * A v3/v10 split broke 442 tests (PR #2536). This prevents regression.
 */
describe('Architecture: single minimatch major version', () => {
  it('should have only one major version of minimatch in the lockfile', () => {
    const lockfile = readFileSync(path.resolve(__dirname, '../../../pnpm-lock.yaml'), 'utf-8');
    // Match "minimatch@<version>" but exclude @types/minimatch
    const versions = [...lockfile.matchAll(/(?<!@types\/)minimatch@(\d+)\.\d+\.\d+/g)].map(
      (m) => m[1]
    );
    const majors = [...new Set(versions)];
    const sortedMajors = majors.sort();
    expect(sortedMajors).toEqual(['10', '3', '5', '9']);
  });
});
