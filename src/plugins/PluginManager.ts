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

function readRegistry(): PluginRegistryEntry[] {
  if (!fs.existsSync(REGISTRY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  } catch {
    debug('Failed to parse registry.json — returning empty');
    return [];
  }
}

function writeRegistry(entries: PluginRegistryEntry[]): void {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(entries, null, 2));
}

function updateRegistry(entry: PluginRegistryEntry): void {
  const entries = readRegistry().filter((e) => e.name !== entry.name);
  entries.push(entry);
  writeRegistry(entries);
}

function removeFromRegistry(name: string): void {
  writeRegistry(readRegistry().filter((e) => e.name !== name));
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

function readPackageVersion(pluginPath: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function deriveNameFromPath(pluginPath: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginPath, 'package.json'), 'utf-8'));
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
  if (typeof repoUrl !== 'string' || repoUrl.trim().startsWith('-')) {
    throw new PluginValidationError('Invalid repository URL: cannot start with a dash');
  }

  try {
    const parsed = new URL(repoUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new PluginValidationError('Invalid repository URL: must use http or https protocol');
    }
  } catch (err) {
    throw new PluginValidationError('Invalid repository URL format');
  }

  fs.mkdirSync(PLUGINS_DIR, { recursive: true });

  // Clone into a temp dir first so we can read the name before committing
  const tempName = `_install_${Date.now()}`;
  const tempPath = path.join(PLUGINS_DIR, tempName);

  try {
    debug('Cloning %s → %s', repoUrl, tempPath);
    exec('git', ['clone', '--depth', '1', repoUrl, tempPath], PLUGINS_DIR);

    const name = deriveNameFromPath(tempPath);
    const pluginPath = path.join(PLUGINS_DIR, name);

    // If already installed, refuse — use updatePlugin instead
    if (fs.existsSync(pluginPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true });
      throw new Error(
        `Plugin '${name}' is already installed at ${pluginPath}. Use updatePlugin('${name}') to upgrade.`
      );
    }

    // Move temp dir to final location
    fs.renameSync(tempPath, pluginPath);

    debug('Running pnpm install --prod in %s', pluginPath);
    exec('pnpm', ['install', '--prod', '--ignore-scripts'], pluginPath);

    // Load and validate — this is the gate
    const mod = loadPlugin(name);
    const manifest = validateManifest(name, mod);

    const version = readPackageVersion(pluginPath);
    const now = new Date().toISOString();
    const entry: PluginRegistryEntry = { name, repoUrl, installedAt: now, updatedAt: now, version };
    updateRegistry(entry);

    debug('Installed plugin %s@%s', name, version);
    return { ...entry, manifest, pluginPath };
  } catch (err) {
    // Clean up temp dir on failure
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true });
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

  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin '${name}' not found at ${pluginPath}. Is it installed?`);
  }

  evictFromCache(pluginPath);
  fs.rmSync(pluginPath, { recursive: true, force: true });
  removeFromRegistry(name);

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

  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Plugin '${name}' not found at ${pluginPath}. Install it first.`);
  }

  debug('Pulling latest for %s', name);
  exec('git', ['pull', '--ff-only'], pluginPath);
  exec('pnpm', ['install', '--prod', '--ignore-scripts'], pluginPath);

  evictFromCache(pluginPath);

  // Reload and re-validate — type may have changed in an update
  const mod = loadPlugin(name);
  const manifest = validateManifest(name, mod);

  const version = readPackageVersion(pluginPath);
  const existing = readRegistry().find((e) => e.name === name);
  const entry: PluginRegistryEntry = {
    name,
    repoUrl: existing?.repoUrl ?? '',
    installedAt: existing?.installedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version,
  };
  updateRegistry(entry);

  debug('Updated plugin %s@%s', name, version);
  return { ...entry, manifest, pluginPath };
}

/**
 * List all installed community plugins.
 * Combines registry entries with any manually-dropped directories not in registry.
 */
export function listInstalledPlugins(): PluginInfo[] {
  const results: PluginInfo[] = [];

  if (!fs.existsSync(PLUGINS_DIR)) return results;

  const registry = readRegistry();
  const registryMap = new Map(registry.map((e) => [e.name, e]));

  // Scan directory — includes manually installed plugins not in registry
  const dirs = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_install_' && !d.name.startsWith('_install_'))
    .map((d) => d.name);

  for (const name of dirs) {
    const pluginPath = path.join(PLUGINS_DIR, name);
    try {
      const mod = loadPlugin(name);
      const manifest = mod.manifest as PluginManifest;
      if (!manifest) continue;

      const registryEntry = registryMap.get(name);
      const version = readPackageVersion(pluginPath);
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
