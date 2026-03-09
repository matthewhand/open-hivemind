import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import type { PluginManifest } from '@src/plugins/PluginLoader';
import {
  installPlugin,
  listInstalledPlugins,
  uninstallPlugin,
  updatePlugin,
} from '@src/plugins/PluginManager';
import { authenticateToken, requireRole } from '@src/server/middleware/auth';

const debug = Debug('app:marketplace');
const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  /** Local (built-in) version */
  localVersion?: string;
  /** GitHub registry version (latest available) */
  registryVersion?: string;
  /** Currently active version */
  version: string;
  /** Status */
  status: 'built-in' | 'installed' | 'available' | 'update-available';
  /** Source of current version: 'local' | 'registry' */
  source?: 'local' | 'registry';
  /** GitHub repo URL */
  repoUrl?: string;
  /** Changelog for latest version */
  changelog?: string;
  installedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// GitHub Registry
// ---------------------------------------------------------------------------

const REGISTRY_URL =
  'https://raw.githubusercontent.com/matthewhand/open-hivemind/main/packages/registry.json';
const REGISTRY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GitHubRegistry {
  version: string;
  updated: string;
  packages: Record<
    string,
    {
      displayName: string;
      description: string;
      version: string;
      repoUrl: string;
      changelog?: string;
    }
  >;
}

let registryCache: {
  data: GitHubRegistry | null;
  fetchedAt: number;
} = { data: null, fetchedAt: 0 };

/**
 * Fetch the GitHub registry with caching
 */
async function fetchGitHubRegistry(): Promise<GitHubRegistry | null> {
  const now = Date.now();

  // Check cache
  if (
    registryCache.data &&
    registryCache.fetchedAt &&
    now - registryCache.fetchedAt < REGISTRY_CACHE_TTL * 1000
  ) {
    debug('Using cached registry (age: %dms)', now - registryCache.fetchedAt);
    return registryCache.data;
  }

  try {
    debug('Fetching GitHub registry from %s', REGISTRY_URL);
    const response = await fetch(REGISTRY_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Open-Hivemind-Marketplace/1.0',
      },
    });

    if (!response.ok) {
      debug('Failed to fetch registry: %d', response.status);
      return null;
    }

    const data = await response.json();
    registryCache = { data, fetchedAt: now };
    return data;
  } catch (e) {
    debug('Error fetching registry: %s', e);
    return null;
  }
}

/**
 * Compare two semver versions
 */
function compareVersions(local: string, github: string): -1 | 0 | 1 {
  const localParts = local.split('.').map(Number);
  const githubParts = github.split('.').map(Number);

  for (let i = 0; i < Math.max(localParts.length, githubParts.length); i++) {
    const localPart = localParts[i] || 0;
    const githubPart = githubParts[i] || 0;
    if (githubPart > localPart) return 1;
    if (githubPart < localPart) return -1;
  }
  return 0; // Equal
}

// ---------------------------------------------------------------------------
// Package Discovery
// ---------------------------------------------------------------------------

const PACKAGES_DIR = path.resolve(__dirname, '../../../../packages');
const _PLUGINS_DIR = path.resolve(__dirname, '../../../../plugins');

/**
 * Scan built-in packages directory for available providers.
 */
function scanBuiltInPackages(): MarketplacePackage[] {
  const packages: MarketplacePackage[] = [];

  if (!fs.existsSync(PACKAGES_DIR)) {
    debug('packages/ directory not found');
    return packages;
  }

  const dirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir);
    const pkgJsonPath = path.join(pkgPath, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) continue;

    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const indexPath = path.join(pkgPath, 'src', 'index.ts');

      // Try to load manifest from the package
      let manifest: PluginManifest | undefined;
      if (fs.existsSync(indexPath)) {
        try {
          // Clear require cache to get fresh manifest
          delete require.cache[require.resolve(indexPath)];
          const mod = require(indexPath);
          manifest = mod.manifest;
        } catch (e) {
          debug('Could not load manifest from %s: %s', dir, e);
        }
      }

      // Derive type from package name prefix
      const namePrefix = dir.split('-')[0];
      const validTypes = ['llm', 'message', 'memory', 'tool'] as const;
      const type = validTypes.includes(namePrefix as any)
        ? (namePrefix as MarketplacePackage['type'])
        : 'tool';

      packages.push({
        name: dir,
        displayName: manifest?.displayName || pkgJson.name || dir,
        description: manifest?.description || pkgJson.description || 'No description available',
        type: manifest?.type || type,
        localVersion: pkgJson.version || '0.0.0',
        version: pkgJson.version || '0.0.0',
        status: 'built-in',
        source: 'local',
      });
    } catch (e) {
      debug('Failed to read package %s: %s', dir, e);
    }
  }

  return packages;
}

/**
 * Get installed community plugins.
 */
function getInstalledPlugins(): MarketplacePackage[] {
  const plugins: MarketplacePackage[] = [];

  try {
    const installed = listInstalledPlugins();

    for (const plugin of installed) {
      plugins.push({
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed',
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
      });
    }
  } catch (e) {
    debug('Failed to list installed plugins: %s', e);
  }

  return plugins;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All marketplace routes require authentication
router.use(authenticateToken);

/**
 * GET /api/marketplace/packages
 * List all available packages (built-in + installed + GitHub updates)
 */
router.get('/packages', async (req, res) => {
  try {
    const builtIn = scanBuiltInPackages();
    const installed = getInstalledPlugins();
    const githubRegistry = await fetchGitHubRegistry();

    // Merge packages with GitHub overrides
    const packageMap = new Map<string, MarketplacePackage>();

    // Add built-in packages
    for (const pkg of builtIn) {
      packageMap.set(pkg.name, pkg);
    }

    // Add installed plugins (override built-in)
    for (const pkg of installed) {
      packageMap.set(pkg.name, pkg);
    }

    // Apply GitHub registry overrides
    if (githubRegistry?.packages) {
      for (const [name, githubPkg] of Object.entries(githubRegistry.packages)) {
        const existing = packageMap.get(name);

        if (existing) {
          // Show both versions
          const localVersion = existing.localVersion || existing.version;
          const registryVersion = githubPkg.version;
          const updateAvailable = compareVersions(localVersion, registryVersion) > 0;

          // Merge with GitHub metadata, but keep both versions visible
          packageMap.set(name, {
            ...existing,
            displayName: githubPkg.displayName || existing.displayName,
            description: githubPkg.description || existing.description,
            localVersion,
            registryVersion,
            version: localVersion, // Default to local
            status: updateAvailable ? 'update-available' : existing.status,
            changelog: githubPkg.changelog,
            repoUrl: githubPkg.repoUrl || existing.repoUrl,
          });
        } else {
          // Package not installed locally, show as available from registry
          const namePrefix = name.split('-')[0];
          const validTypes = ['llm', 'message', 'memory', 'tool'] as const;
          const type = validTypes.includes(namePrefix as any)
            ? (namePrefix as MarketplacePackage['type'])
            : 'tool';

          packageMap.set(name, {
            name,
            displayName: githubPkg.displayName,
            description: githubPkg.description,
            type,
            registryVersion: githubPkg.version,
            version: githubPkg.version,
            status: 'available',
            source: 'registry',
            repoUrl: githubPkg.repoUrl,
          });
        }
      }
    }

    const packages = Array.from(packageMap.values());
    debug('Returning %d packages', packages.length);

    return res.json(packages);
  } catch (err: any) {
    debug('Error listing packages: %s', err);
    return res.status(500).json({ error: 'Failed to list packages', message: err.message });
  }
});

/**
 * GET /api/marketplace/packages/:name
 * Get single package details
 */
router.get('/packages/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const builtIn = scanBuiltInPackages();
    const installed = getInstalledPlugins();
    const githubRegistry = await fetchGitHubRegistry();

    const pkg = [...installed, ...builtIn].find((p) => p.name === name);

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Apply GitHub override if available
    if (githubRegistry?.packages?.[name]) {
      const githubPkg = githubRegistry.packages[name];
      const updateAvailable = compareVersions(pkg.version, githubPkg.version) > 0;

      return res.json({
        ...pkg,
        displayName: githubPkg.displayName || pkg.displayName,
        description: githubPkg.description || pkg.description,
        githubVersion: githubPkg.version,
        updateAvailable,
        changelog: githubPkg.changelog,
      });
    }

    return res.json(pkg);
  } catch (err: any) {
    debug('Error getting package: %s', err);
    return res.status(500).json({ error: 'Failed to get package', message: err.message });
  }
});

/**
 * POST /api/marketplace/install
 * Install a community plugin from GitHub URL
 * Body: { repoUrl: string }
 */
router.post('/install', requireRole('admin'), async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid repoUrl' });
    }

    debug('Installing plugin from %s', repoUrl);

    const plugin = await installPlugin(repoUrl);

    return res.status(201).json({
      success: true,
      package: {
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed' as const,
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
      },
    });
  } catch (err: any) {
    debug('Install error: %s', err);
    return res.status(400).json({ error: 'Installation failed', message: err.message });
  }
});

/**
 * POST /api/marketplace/uninstall/:name
 * Uninstall a community plugin
 */
router.post('/uninstall/:name', requireRole('admin'), async (req, res) => {
  try {
    const name = req.params.name;

    debug('Uninstalling plugin %s', name);

    await uninstallPlugin(name);

    return res.json({ success: true, message: `Plugin ${name} uninstalled` });
  } catch (err: any) {
    debug('Uninstall error: %s', err);
    return res.status(400).json({ error: 'Uninstall failed', message: err.message });
  }
});

/**
 * POST /api/marketplace/update/:name
 * Update a community plugin to latest version
 */
router.post('/update/:name', requireRole('admin'), async (req, res) => {
  try {
    const name = req.params.name;

    debug('Updating plugin %s', name);

    const plugin = await updatePlugin(name);

    return res.json({
      success: true,
      package: {
        name: plugin.name,
        displayName: plugin.manifest.displayName,
        description: plugin.manifest.description,
        type: plugin.manifest.type,
        version: plugin.version,
        status: 'installed' as const,
        repoUrl: plugin.repoUrl,
        installedAt: plugin.installedAt,
        updatedAt: plugin.updatedAt,
      },
    });
  } catch (err: any) {
    debug('Update error: %s', err);
    return res.status(400).json({ error: 'Update failed', message: err.message });
  }
});

/**
 * GET /api/marketplace/registry
 * Get the raw GitHub registry (for debugging)
 */
router.get('/registry', async (req, res) => {
  try {
    const registry = await fetchGitHubRegistry();
    return res.json(registry);
  } catch (err: any) {
    debug('Error fetching registry: %s', err);
    return res.status(500).json({ error: 'Failed to fetch registry', message: err.message });
  }
});

export default router;
