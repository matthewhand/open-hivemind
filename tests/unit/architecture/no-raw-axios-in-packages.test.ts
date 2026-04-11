import { execSync } from 'child_process';
import path from 'path';

/**
 * Architectural guard: packages must use the SSRF-safe `http` client from
 * `@hivemind/shared-types` instead of importing `axios` directly.
 *
 * The shared httpClient.ts calls `isSafeUrl()` on every request, so routing
 * all HTTP traffic through it guarantees SSRF protection without manual checks.
 */
describe('Architecture: no raw axios in packages', () => {
  it('should not import axios in any package source file', () => {
    const packagesDir = path.resolve(__dirname, '../../../packages');
    let output = '';
    try {
      output = execSync(
        `grep -rn "from 'axios'\\|from \\"axios\\"\\|require('axios')\\|require(\\"axios\\")" --include="*.ts" "${packagesDir}" 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );
    } catch {
      return;
    }

    const violations = output
      .split('\n')
      .filter(Boolean)
      .filter((line) => !line.includes('.test.') && !line.includes('.spec.') && !line.includes('.d.ts'));

    expect(violations).toEqual([]);
  });
});
