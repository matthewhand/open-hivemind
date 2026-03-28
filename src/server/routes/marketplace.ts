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
  version: string;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  installedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Package Discovery
// ---------------------------------------------------------------------------

const PACKAGES_DIR = path.resolve(__dirname, '../../../../packages');
const _PLUGINS_DIR = path.resolve(__dirname, '../../../../plugins');

/**
 * Scan built-in packages directory for available providers.
 */
async function scanBuiltInPackages(): Promise<MarketplacePackage[]> {
  const packages: MarketplacePackage[] = [];

  try {
    const dirs = await fs.promises.readdir(PACKAGES_DIR, { withFileTypes: true });
    const packageDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

    for (const dir of packageDirs) {
      const pkgPath = path.join(PACKAGES_DIR, dir);
      const pkgJsonPath = path.join(pkgPath, 'package.json');

      try {
        const pkgJsonContent = await fs.promises.readFile(pkgJsonPath, 'utf-8');
        const pkgJson = JSON.parse(pkgJsonContent);
        const indexPath = path.join(pkgPath, 'src', 'index.ts');

        // Try to load manifest from the package
        let manifest: PluginManifest | undefined;
        try {
          await fs.promises.access(indexPath);
          // Clear require cache to get fresh manifest
          delete require.cache[require.resolve(indexPath)];
          const mod = require(indexPath);
          manifest = mod.manifest;
        } catch (e) {
          debug('Could not load manifest from %s: %s', dir, e);
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
          version: pkgJson.version || '0.0.0',
          status: 'built-in',
        });
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          debug('Failed to read package %s: %s', dir, e);
        }
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      debug('Failed to read packages directory: %s', e);
    } else {
      debug('packages/ directory not found');
    }
  }

  return packages;
}

/**
 * Get installed community plugins.
 */
async function getInstalledPlugins(): Promise<MarketplacePackage[]> {
  const plugins: MarketplacePackage[] = [];

  try {
    const installed = await listInstalledPlugins();

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

// ⚡ Bolt Optimization: Cache expensive file system reads and module loading
let cachedPackages: MarketplacePackage[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

async function getPackages(): Promise<MarketplacePackage[]> {
  const now = Date.now();

  // Return cached result if still valid
  if (cachedPackages && now - cacheTimestamp < CACHE_TTL_MS) {
    debug(
      'Returning cached packages (%d items, age: %dms)',
      cachedPackages.length,
      now - cacheTimestamp
    );
    return cachedPackages;
  }

  // Cache miss or expired - scan filesystem
  debug('Cache miss or expired, scanning packages');
  const builtIn = await scanBuiltInPackages();
  const installed = await getInstalledPlugins();

  // Merge: built-in packages take precedence, then installed plugins
  const packageMap = new Map<string, MarketplacePackage>();

  for (const pkg of [...builtIn, ...installed]) {
    packageMap.set(pkg.name, pkg);
  }

  cachedPackages = Array.from(packageMap.values());
  cacheTimestamp = now;

  return cachedPackages;
}

function invalidateCache(): void {
  debug('Invalidating marketplace cache');
  cachedPackages = null;
  cacheTimestamp = 0;
}

/**
 * GET /api/marketplace/packages
 * List all available packages (built-in + installed)
 */
router.get('/packages', async (req, res) => {
  try {
    const packages = await getPackages();
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
    const packages = await getPackages();

    const pkg = packages.find((p) => p.name === name);

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
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

    // ⚡ Bolt Optimization: Invalidate cache after install
    invalidateCache();

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

    // ⚡ Bolt Optimization: Invalidate cache after uninstall
    invalidateCache();

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

    // ⚡ Bolt Optimization: Invalidate cache after update
    invalidateCache();

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

export default router;
