import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import Debug from 'debug';

const execAsync = promisify(exec);

const debug = Debug('app:version-tracking');

const GIT_TIMEOUT_MS = 10_000;

/** Allowlist sanitiser — rejects strings containing shell metacharacters. */
function sanitizeGitArg(value: string, label: string): string {
  if (!/^[a-zA-Z0-9._/\-]+$/.test(value)) {
    throw new Error(`Invalid characters in ${label}: ${value}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VersionHistoryEntry {
  version: string;
  date: string;
  message: string;
  author?: string;
  sha?: string;
}

export interface VersionInfo {
  current: string;
  latest?: string;
  hasUpdate: boolean;
  changelog?: VersionHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Version Comparison
// ---------------------------------------------------------------------------

/**
 * Compare two semantic versions.
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const cleaned = v.replace(/^v/, '');
    const parts = cleaned.split(/[.-]/).map((p) => {
      const num = parseInt(p, 10);
      return isNaN(num) ? 0 : num;
    });
    return parts;
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

/**
 * Check if version A is newer than version B.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(latest, current) > 0;
}

// ---------------------------------------------------------------------------
// Git Repository Version Checking
// ---------------------------------------------------------------------------

/**
 * Fetch the latest version from a git repository without cloning.
 * Checks both git tags and package.json in the default branch.
 */
export async function fetchLatestVersionFromGit(
  repoUrl: string,
  pluginPath?: string
): Promise<string | undefined> {
  try {
    // If we have a local plugin path, fetch from remote
    if (pluginPath) {
      let gitExists = false;
      try {
        // ⚡ Bolt Optimization: Replaced synchronous fs.existsSync with async fs.promises.access to prevent event loop blocking.
        await fs.promises.access(path.join(pluginPath, '.git'));
        gitExists = true;
      } catch (e) {
        // .git does not exist or is not accessible
      }

      if (gitExists) {
        try {
          // ⚡ Bolt Optimization: Converted from execSync to execAsync to prevent event loop blocking.
          await execAsync('git fetch --tags --quiet', { cwd: pluginPath, timeout: GIT_TIMEOUT_MS });

          // Try to get the latest tag
          const { stdout: tags } = await execAsync('git tag --sort=-v:refname', {
            cwd: pluginPath,
            encoding: 'utf-8',
          });
          const latestTag = tags.trim().split('\n')[0];

          if (latestTag) {
            debug('Latest tag for %s: %s', pluginPath, latestTag);
            return latestTag.replace(/^v/, '');
          }

          // Fall back to checking package.json on origin/main or origin/master
          const branches = ['origin/main', 'origin/master'];
          for (const branch of branches) {
            try {
              const safeBranch = sanitizeGitArg(branch, 'branch');
              const { stdout: pkgJson } = await execAsync(`git show ${safeBranch}:package.json`, {
                cwd: pluginPath,
                encoding: 'utf-8',
              });
              const pkg = JSON.parse(pkgJson);
              if (pkg.version) {
                debug('Latest version from %s package.json: %s', branch, pkg.version);
                return pkg.version;
              }
            } catch {
              continue;
            }
          }
        } catch (e) {
          debug('Error fetching from git: %s', e);
        }
      }
    }

    // For GitHub repos, we could use the GitHub API in the future
    // For now, return undefined if we can't check locally
    return undefined;
  } catch (e) {
    debug('Error checking latest version: %s', e);
    return undefined;
  }
}

/**
 * Get version history/changelog from git commits.
 */
export async function fetchChangelog(
  pluginPath: string,
  currentVersion: string,
  limit: number = 10
): Promise<VersionHistoryEntry[]> {
  const changelog: VersionHistoryEntry[] = [];

  try {
    try {
      // ⚡ Bolt Optimization: Replaced synchronous fs.existsSync with async fs.promises.access to prevent event loop blocking.
      await fs.promises.access(path.join(pluginPath, '.git'));
    } catch (e) {
      // .git does not exist or is not accessible
      return changelog;
    }

    // Fetch latest changes
    // ⚡ Bolt Optimization: Converted from execSync to execAsync to prevent event loop blocking.
    await execAsync('git fetch --quiet', { cwd: pluginPath, timeout: GIT_TIMEOUT_MS });

    // Get commits since current version tag (if it exists) or recent commits
    let gitCommand = 'git log --pretty=format:"%H|%ai|%an|%s" -n 10 origin/HEAD';

    try {
      // Try to find commits since current version
      const currentTag = sanitizeGitArg(`v${currentVersion}`, 'version tag');
      await execAsync(`git rev-parse ${currentTag}`, { cwd: pluginPath, timeout: GIT_TIMEOUT_MS });
      gitCommand = `git log --pretty=format:"%H|%ai|%an|%s" ${currentTag}..origin/HEAD`;
    } catch {
      // Tag doesn't exist, fall back to recent commits
    }

    const { stdout: output } = await execAsync(gitCommand, {
      cwd: pluginPath,
      encoding: 'utf-8',
    });

    const lines = output
      .trim()
      .split('\n')
      .filter((l) => l);

    for (const line of lines.slice(0, limit)) {
      const [sha, date, author, message] = line.split('|');
      if (sha && date && message) {
        // Try to extract version from commit message
        const versionMatch = message.match(/\b(\d+\.\d+\.\d+)\b/);
        const version = versionMatch ? versionMatch[1] : '';

        changelog.push({
          version,
          date: new Date(date).toISOString(),
          message: message.trim(),
          author: author?.trim(),
          sha: sha.substring(0, 7),
        });
      }
    }

    debug('Fetched %d changelog entries for %s', changelog.length, pluginPath);
  } catch (e) {
    debug('Error fetching changelog: %s', e);
  }

  return changelog;
}

/**
 * Check for updates for a given plugin.
 */
export async function checkForUpdates(
  pluginPath: string,
  currentVersion: string,
  repoUrl?: string
): Promise<VersionInfo> {
  const latestVersion = await fetchLatestVersionFromGit(repoUrl || '', pluginPath);
  const hasUpdate = latestVersion ? isNewerVersion(currentVersion, latestVersion) : false;

  let changelog: VersionHistoryEntry[] | undefined;
  if (hasUpdate) {
    changelog = await fetchChangelog(pluginPath, currentVersion);
  }

  return {
    current: currentVersion,
    latest: latestVersion,
    hasUpdate,
    changelog,
  };
}
