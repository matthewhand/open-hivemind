import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { loadPlugin, PLUGINS_DIR, type PluginManifest } from './PluginLoader';

const debug = Debug('app:pluginManager');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginRegistryEntry {
  /** Package name, e.g. 'llm-myprovider' */
  name: string;
  /** Git remote the plugin was cloned from */
  repoUrl: string;
  /** ISO timestamp of installation */
  installedAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Version read from package.json at install/update time */
  version: string;
}

export interface PluginInfo extends PluginRegistryEntry {
  manifest: PluginManifest;
  /** Absolute path to the plugin directory */
  pluginPath: string;
}

export class PluginValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginValidationError';
  }
}

// ---------------------------------------------------------------------------
// Registry helpers
// ---------------------------------------------------------------------------

const REGISTRY_FILE = path.join(PLUGINS_DIR, 'registry.json');

async function readRegistry(): Promise<PluginRegistryEntry[]> {
  try {
    const content = await fs.promises.readFile(REGISTRY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return [];
    }
    debug('Failed to parse registry.json — returning empty');
    return [];
  }
}

async function writeRegistry(entries: PluginRegistryEntry[]): Promise<void> {
  await fs.promises.mkdir(PLUGINS_DIR, { recursive: true });
  await fs.promises.writeFile(REGISTRY_FILE, JSON.stringify(entries, null, 2));
}

async function updateRegistry(entry: PluginRegistryEntry): Promise<void> {
  const entries = (await readRegistry()).filter((e) => e.name !== entry.name);
  entries.push(entry);
  await writeRegistry(entries);
}

async function removeFromRegistry(name: string): Promise<void> {
  await writeRegistry((await readRegistry()).filter((e) => e.name !== name));
}

// ---------------------------------------------------------------------------
// Require-cache eviction
// ---------------------------------------------------------------------------

function evictFromCache(pluginPath: string): void {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(pluginPath)) {
      delete require.cache[key];
      debug('Evicted from require cache: %s', key);
    }
  }
}

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

/**
 * Validates that a plugin's exported manifest.type matches the type prefix
 * encoded in its package name.
 *
 * Rule: 'llm-myprovider'.split('-')[0] === manifest.type
 *
 * This prevents a misconfigured community plugin tagged as type 'memory'
 * being loaded as an 'llm' provider silently at runtime.
 */
function validateManifestType(name: string, manifest: PluginManifest): void {
  const namePrefix = name.split('-')[0];
  const validTypes = ['llm', 'message', 'memory', 'tool'] as const;

  if (!validTypes.includes(namePrefix as any)) {
    throw new PluginValidationError(
      `Package name '${name}' must start with a valid type prefix: ${validTypes.join(', ')}. ` +
        `Got prefix '${namePrefix}'.`
    );
  }

  if (manifest.type !== namePrefix) {
    throw new PluginValidationError(
      `Manifest type mismatch for '${name}': ` +
        `package name prefix is '${namePrefix}' but manifest.type is '${manifest.type}'. ` +
        `Rename the package or fix the manifest to match.`
    );
  }
}

/**
 * Validates that a loaded module exports a well-formed manifest.
 */
function validateManifest(name: string, mod: any): PluginManifest {
  const manifest: PluginManifest = mod.manifest;

  if (!manifest) {
    throw new PluginValidationError(
      `Plugin '${name}' does not export a 'manifest'. ` +
        `Add: export const manifest: PluginManifest = { ... } to its index.ts.`
    );
  }
  if (!manifest.displayName || typeof manifest.displayName !== 'string') {
    throw new PluginValidationError(
      `Plugin '${name}' manifest.displayName is missing or not a string.`
    );
  }
  if (!manifest.description || typeof manifest.description !== 'string') {
    throw new PluginValidationError(
      `Plugin '${name}' manifest.description is missing or not a string.`
    );
  }
  if (!manifest.type) {
    throw new PluginValidationError(`Plugin '${name}' manifest.type is missing.`);
  }

  validateManifestType(name, manifest);

  return manifest;
}

// ---------------------------------------------------------------------------
// Package helpers
// ---------------------------------------------------------------------------

async function readPackageVersion(pluginPath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(path.join(pluginPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function deriveNameFromPath(pluginPath: string): Promise<string> {
  try {
    const content = await fs.promises.readFile(path.join(pluginPath, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    // Strip @hivemind/ or @scope/ prefix if present
    return pkg.name?.replace(/^@[^/]+\//, '') ?? path.basename(pluginPath);
  } catch {
    return path.basename(pluginPath);
  }
}

function exec(cmd: string, args: string[], cwd: string): void {
  debug('exec: %s %s (cwd: %s)', cmd, args.join(' '), cwd);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function validateRepoUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new PluginValidationError('Repository URL is required and must be a string.');
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('-')) {
    throw new PluginValidationError('Invalid repository URL: cannot start with a dash.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new PluginValidationError('Invalid repository URL format.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new PluginValidationError(
      'Invalid repository URL protocol. Only http: and https: are allowed.'
    );
  }

  let decodedHostname: string;
  let decodedPathname: string;
  let decodedHref: string;

  try {
    decodedHostname = decodeURIComponent(parsedUrl.hostname);
    decodedPathname = decodeURIComponent(parsedUrl.pathname);
    decodedHref = decodeURIComponent(parsedUrl.href);
  } catch {
    throw new PluginValidationError("Invalid repository URL: malformed URI sequence.");
  }

  // Prevent argument injection via hostname or path
  if (decodedHostname.includes(" ") || decodedPathname.includes(" ")) {
    throw new PluginValidationError("Invalid repository URL: spaces not allowed.");
  }

  // Prevent command injection through special git URL patterns
  if (/--[a-z-]+=/i.test(decodedHref)) {
    throw new PluginValidationError("Invalid repository URL: contains suspicious patterns.");
  }

  // Prevent shell metacharacters in hostname
  if (/[;&|`$()]/.test(decodedHostname)) {
    throw new PluginValidationError("Invalid repository URL: contains shell metacharacters.");
  }
}

/**
 * Install a community plugin from a git repository URL.
 *
 * Steps:
 *   1. git clone <repoUrl> into PLUGINS_DIR/<name>
 *   2. pnpm install --prod in the cloned directory
 *   3. Load the module and validate manifest.type matches name prefix
 *   4. Add to registry
 *
 * @throws PluginValidationError if the manifest is invalid or type mismatches
 */
export async function installPlugin(repoUrl: string): Promise<PluginInfo> {
  validateRepoUrl(repoUrl);
  await fs.promises.mkdir(PLUGINS_DIR, { recursive: true });

  // Clone into a temp dir first so we can read the name before committing
  const tempName = `_install_${Date.now()}`;
  const tempPath = path.join(PLUGINS_DIR, tempName);

  try {
    debug('Cloning %s → %s', repoUrl, tempPath);
    exec('git', ['clone', '--depth', '1', repoUrl, tempPath], PLUGINS_DIR);

    const name = await deriveNameFromPath(tempPath);
    const pluginPath = path.join(PLUGINS_DIR, name);

    // If already installed, refuse — use updatePlugin instead
    try {
      await fs.promises.access(pluginPath);
      await fs.promises.rm(tempPath, { recursive: true, force: true });
      throw new Error(
        `Plugin '${name}' is already installed at ${pluginPath}. Use updatePlugin('${name}') to upgrade.`
      );
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }

    // Move temp dir to final location
    await fs.promises.rename(tempPath, pluginPath);

    debug('Running pnpm install --prod in %s', pluginPath);
    exec('pnpm', ['install', '--prod', '--ignore-scripts'], pluginPath);

    // Load and validate — this is the gate
    const mod = loadPlugin(name);
    const manifest = validateManifest(name, mod);

    const version = await readPackageVersion(pluginPath);
    const now = new Date().toISOString();
    const entry: PluginRegistryEntry = { name, repoUrl, installedAt: now, updatedAt: now, version };
    await updateRegistry(entry);

    debug('Installed plugin %s@%s', name, version);
    return { ...entry, manifest, pluginPath };
  } catch (err) {
    // Clean up temp dir on failure
    try {
      await fs.promises.access(tempPath);
      await fs.promises.rm(tempPath, { recursive: true, force: true });
    } catch {
      // Temp path doesn't exist, nothing to clean up
    }
    throw err;
  }
}

/**
 * Uninstall a community plugin by name.
 *
 * Steps:
 *   1. Evict from require cache
 *   2. Remove plugin directory
 *   3. Remove from registry
 *
 * @throws Error if the plugin is not found in PLUGINS_DIR
 */
export async function uninstallPlugin(name: string): Promise<void> {
  const pluginPath = path.join(PLUGINS_DIR, name);

  try {
    await fs.promises.access(pluginPath);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error(`Plugin '${name}' not found at ${pluginPath}. Is it installed?`);
    }
    throw e;
  }

  evictFromCache(pluginPath);
  await fs.promises.rm(pluginPath, { recursive: true, force: true });
  await removeFromRegistry(name);

  debug('Uninstalled plugin %s', name);
}

/**
 * Update a community plugin to its latest commit.
 *
 * Steps:
 *   1. git pull in the plugin directory
 *   2. pnpm install --prod
 *   3. Evict require cache
 *   4. Reload and re-validate manifest (catches type changes post-update)
 *   5. Update registry
 *
 * @throws PluginValidationError if the updated plugin fails manifest validation
 */
export async function updatePlugin(name: string): Promise<PluginInfo> {
  const pluginPath = path.join(PLUGINS_DIR, name);

  try {
    await fs.promises.access(pluginPath);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error(`Plugin '${name}' not found at ${pluginPath}. Install it first.`);
    }
    throw e;
  }

  debug('Pulling latest for %s', name);
  exec('git', ['pull', '--ff-only'], pluginPath);
  exec('pnpm', ['install', '--prod', '--ignore-scripts'], pluginPath);

  evictFromCache(pluginPath);

  // Reload and re-validate — type may have changed in an update
  const mod = loadPlugin(name);
  const manifest = validateManifest(name, mod);

  const version = await readPackageVersion(pluginPath);
  const existing = (await readRegistry()).find((e) => e.name === name);
  const entry: PluginRegistryEntry = {
    name,
    repoUrl: existing?.repoUrl ?? '',
    installedAt: existing?.installedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version,
  };
  await updateRegistry(entry);

  debug('Updated plugin %s@%s', name, version);
  return { ...entry, manifest, pluginPath };
}

/**
 * List all installed community plugins.
 * Combines registry entries with any manually-dropped directories not in registry.
 */
export async function listInstalledPlugins(): Promise<PluginInfo[]> {
  const results: PluginInfo[] = [];

  try {
    await fs.promises.access(PLUGINS_DIR);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      return results;
    }
    throw e;
  }

  const registry = await readRegistry();
  const registryMap = new Map(registry.map((e) => [e.name, e]));

  // Scan directory — includes manually installed plugins not in registry
  const dirEntries = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true });
  const dirs = dirEntries
    .filter((d) => d.isDirectory() && d.name !== '_install_' && !d.name.startsWith('_install_'))
    .map((d) => d.name);

  for (const name of dirs) {
    const pluginPath = path.join(PLUGINS_DIR, name);
    try {
      const mod = loadPlugin(name);
      const manifest = mod.manifest as PluginManifest;
      if (!manifest) continue;

      const registryEntry = registryMap.get(name);
      const version = await readPackageVersion(pluginPath);
      const now = new Date().toISOString();

      results.push({
        name,
        repoUrl: registryEntry?.repoUrl ?? '',
        installedAt: registryEntry?.installedAt ?? now,
        updatedAt: registryEntry?.updatedAt ?? now,
        version,
        manifest,
        pluginPath,
      });
    } catch (e) {
      debug('Skipping directory %s — failed to load: %s', name, e);
    }
  }

  return results;
}
