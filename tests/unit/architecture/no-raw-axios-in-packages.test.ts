import { execSync } from 'child_process';
import path from 'path';

/**
 * Architectural guard: packages AND server-side code must use the SSRF-safe
 * `http` client from `@hivemind/shared-types` instead of importing axios directly.
 *
 * The shared httpClient.ts calls `isSafeUrl()` on every request, so routing
 * all HTTP traffic through it guarantees SSRF protection without manual checks.
 *
 * Scope: packages/, src/server/, src/webhook/
 * Excluded: test files, declaration files, node_modules, dist/
 */

const AXIOS_IMPORT_PATTERN =
  `"from 'axios'\\|from \\"axios\\"\\|require('axios')\\|require(\\"axios\\")"`;

const DIRS_TO_GUARD = [
  ['packages', path.resolve(__dirname, '../../../packages')],
  ['src/server', path.resolve(__dirname, '../../../src/server')],
  ['src/webhook', path.resolve(__dirname, '../../../src/webhook')],
] as const;

const EXCLUDED_SUFFIXES = ['.test.', '.spec.', '.d.ts'];
const EXCLUDED_PATHS = ['node_modules', '/dist/', '/build/'];

function findAxiosViolations(dir: string): string[] {
  let output = '';
  try {
    output = execSync(
      `grep -rn ${AXIOS_IMPORT_PATTERN} --include="*.ts" "${dir}" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    );
  } catch {
    // grep exits non-zero when no matches — not an error
    return [];
  }

  return output
    .split('\n')
    .filter(Boolean)
    .filter((line) => !EXCLUDED_SUFFIXES.some((s) => line.includes(s)))
    .filter((line) => !EXCLUDED_PATHS.some((p) => line.includes(p)));
}

describe('Architecture: no raw axios imports', () => {
  for (const [label, dir] of DIRS_TO_GUARD) {
    it(`should not import axios directly in ${label}/`, () => {
      const violations = findAxiosViolations(dir);
      if (violations.length > 0) {
        throw new Error(
          `Found ${violations.length} raw axios import(s) in ${label}/.\n` +
          `Use the SSRF-safe http client from @hivemind/shared-types instead:\n\n` +
          violations.join('\n')
        );
      }
      expect(violations).toEqual([]);
    });
  }
});
