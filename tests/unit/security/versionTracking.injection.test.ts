/**
 * Security + behavior tests for src/server/utils/versionTracking.ts
 *
 * The module shells out to `git` to inspect plugin repositories. A previous
 * implementation built command strings via interpolation and passed them to a
 * promisified `child_process.exec`, which spawns a shell and is therefore
 * vulnerable to command injection when any interpolated value (branch name,
 * version tag) contains shell metacharacters.
 *
 * The hardened implementation routes every git invocation through
 * `executeCommandSafe`, which uses `execFile` with `shell: false` and an
 * argument array. These tests pin that contract so the fix cannot silently
 * regress:
 *   - git is always invoked as ('git', [args...]) — never a single
 *     interpolated string, and no argument is ever shell-quoted.
 *   - injection payloads in user-influenced inputs (version tags) are rejected
 *     by the allowlist sanitiser before any process is spawned.
 *   - the pure version-comparison helpers behave correctly.
 */

import * as fs from 'fs';
import {
  compareVersions,
  fetchChangelog,
  fetchLatestVersionFromGit,
  isNewerVersion,
} from '../../../src/server/utils/versionTracking';

// Mock the safe command executor so we can inspect exactly how git is invoked
// without spawning real processes.
const executeCommandSafe = jest.fn();
jest.mock('../../../src/utils/utils', () => ({
  executeCommandSafe: (...args: unknown[]) => executeCommandSafe(...args),
}));

const PLUGIN_PATH = '/tmp/some-plugin';

beforeEach(() => {
  executeCommandSafe.mockReset();
  // Pretend the plugin directory is a git repo so the git code paths run.
  jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('versionTracking — safe git invocation contract', () => {
  it('always invokes executeCommandSafe with a command + array of args (never a shell string)', async () => {
    executeCommandSafe.mockResolvedValue('v1.2.3\nv1.0.0\n');

    await fetchLatestVersionFromGit('https://example.com/repo.git', PLUGIN_PATH);

    expect(executeCommandSafe).toHaveBeenCalled();
    for (const call of executeCommandSafe.mock.calls) {
      const [command, args] = call;
      expect(command).toBe('git');
      expect(Array.isArray(args)).toBe(true);
      // No argument should be a pre-joined string containing the whole command.
      for (const arg of args as string[]) {
        expect(typeof arg).toBe('string');
        // A shell-injection-style payload would never appear because args are
        // passed verbatim to execFile; assert no shell-quoting was applied.
        expect(arg).not.toMatch(/^".*"$/);
      }
    }
  });

  it('passes git fetch --tags as discrete array arguments', async () => {
    executeCommandSafe.mockResolvedValue('v2.0.0\n');

    await fetchLatestVersionFromGit('https://example.com/repo.git', PLUGIN_PATH);

    expect(executeCommandSafe).toHaveBeenCalledWith(
      'git',
      ['fetch', '--tags', '--quiet'],
      expect.objectContaining({ cwd: PLUGIN_PATH })
    );
  });

  it('returns the latest tag stripped of a leading v', async () => {
    executeCommandSafe.mockResolvedValue('v3.4.5\nv3.4.0\n');

    const latest = await fetchLatestVersionFromGit('https://example.com/repo.git', PLUGIN_PATH);

    expect(latest).toBe('3.4.5');
  });

  it('never builds a single interpolated git command string', async () => {
    executeCommandSafe.mockResolvedValue('v1.0.0\n');

    await fetchLatestVersionFromGit('https://example.com/repo.git', PLUGIN_PATH);

    for (const call of executeCommandSafe.mock.calls) {
      const [command] = call;
      // The hardened form is ('git', [...]). A regression to the old form would
      // pass the entire command (e.g. 'git tag --sort=-v:refname') as a string.
      expect(command).not.toMatch(/\s/);
    }
  });
});

describe('versionTracking — sanitiser rejects injection payloads', () => {
  const INJECTION_PAYLOADS = [
    '1.0.0; rm -rf /',
    '1.0.0 && curl evil.test',
    '$(touch pwned)',
    '`whoami`',
    '1.0.0|cat /etc/passwd',
    '1.0.0\nrm -rf .',
  ];

  it.each(INJECTION_PAYLOADS)(
    'does not pass a malicious version tag (%s) to git rev-parse',
    async (payload) => {
      // git fetch resolves; the subsequent rev-parse of the (malicious) tag
      // must never receive the raw payload because sanitizeGitArg throws first,
      // pushing execution onto the safe "recent commits" fallback.
      executeCommandSafe.mockResolvedValue('');

      await fetchChangelog(PLUGIN_PATH, payload, 5);

      const revParseCalls = executeCommandSafe.mock.calls.filter(
        (c) => Array.isArray(c[1]) && (c[1] as string[])[0] === 'rev-parse'
      );
      // Either rev-parse was never reached, or its argument is sanitised —
      // in both cases the raw payload must not appear anywhere in args.
      for (const call of executeCommandSafe.mock.calls) {
        const args = (call[1] as string[]) ?? [];
        for (const arg of args) {
          expect(arg).not.toContain(payload);
        }
      }
      // The malicious tag must not have driven a rev-parse with that value.
      for (const call of revParseCalls) {
        expect((call[1] as string[])[1]).not.toBe(`v${payload}`);
      }
    }
  );

  it('uses a well-formed version tag in the log range when the version is clean', async () => {
    // fetch, rev-parse (succeeds), log
    executeCommandSafe
      .mockResolvedValueOnce('') // git fetch
      .mockResolvedValueOnce('') // git rev-parse v1.2.3 (tag exists)
      .mockResolvedValueOnce('abc1234|2024-01-01 00:00:00 +0000|Alice|Release 1.2.4\n');

    const log = await fetchChangelog(PLUGIN_PATH, '1.2.3', 10);

    const logCall = executeCommandSafe.mock.calls.find(
      (c) => Array.isArray(c[1]) && (c[1] as string[])[0] === 'log'
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toContain('v1.2.3..origin/HEAD');
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ author: 'Alice', sha: 'abc1234' });
  });

  it('falls back to recent-commits log args when the version tag is absent', async () => {
    executeCommandSafe
      .mockResolvedValueOnce('') // git fetch
      .mockRejectedValueOnce(new Error('unknown revision')) // rev-parse fails
      .mockResolvedValueOnce(''); // git log fallback

    await fetchChangelog(PLUGIN_PATH, '9.9.9', 10);

    const logCall = executeCommandSafe.mock.calls.find(
      (c) => Array.isArray(c[1]) && (c[1] as string[])[0] === 'log'
    );
    expect(logCall).toBeDefined();
    expect(logCall![1] as string[]).toEqual(expect.arrayContaining(['-n', '10', 'origin/HEAD']));
  });
});

describe('versionTracking — version comparison helpers', () => {
  it('compareVersions orders versions correctly', () => {
    expect(compareVersions('1.2.3', '1.2.2')).toBe(1);
    expect(compareVersions('1.2.2', '1.2.3')).toBe(-1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
  });

  it('compareVersions tolerates a leading v and differing segment counts', () => {
    expect(compareVersions('v1.2.0', '1.2')).toBe(0);
    expect(compareVersions('1.2.1', 'v1.2')).toBe(1);
  });

  it('isNewerVersion reports updates only when latest exceeds current', () => {
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });
});
